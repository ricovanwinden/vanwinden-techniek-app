import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export const TEAMLEDEN = ['Owen', 'Gurkan', 'Rico']

const WerkbonContext = createContext(null)

function bonVanDB(row) {
  return {
    id: row.id,
    datum: row.datum,
    medewerker: row.medewerker,
    klant: row.klant,
    projectnummer: row.projectnummer,
    werkbonnummer: row.werkbonnummer,
    omschrijving: row.omschrijving,
    startTijd: row.start_tijd,
    eindTijd: row.eind_tijd,
    pauze: row.pauze,
    uren: Number(row.uren) || 0,
    vertrek: row.vertrek,
    bestemming: row.bestemming,
    kilometers: Number(row.kilometers) || 0,
    heenTerug: row.heen_terug,
    privaatVoertuig: row.privaat_voertuig,
    kmTotaal: Number(row.km_totaal) || 0,
    fotos: row.fotos || [],
    factuurOntvangen: row.factuur_ontvangen || false,
    factuurGestuurd: row.factuur_gestuurd || false,
  }
}

export function WerkbonProvider({ children }) {
  const [bons, setBons] = useState([])
  const [agendaItems, setAgendaItems] = useState([])
  const [planningItems, setPlanningItems] = useState([])
  const [daglijsten, setDaglijsten] = useState([])
  const [laden, setLaden] = useState(true)

  async function laadBons() {
    const { data } = await supabase.from('werkbonnen').select('*').order('datum', { ascending: false })
    if (data) setBons(data.map(bonVanDB))
  }

  async function laadAgenda() {
    const { data } = await supabase.from('agenda_items').select('*').order('datum').order('tijd')
    if (data) setAgendaItems(data)
  }

  async function laadPlanning() {
    const { data } = await supabase.from('planning_items').select('*').order('datum', { ascending: false })
    if (data) setPlanningItems(data)
  }

  async function laadDaglijsten() {
    const { data } = await supabase.from('daglijsten').select('*').order('datum', { ascending: false })
    if (data) setDaglijsten(data)
  }

  useEffect(() => {
    Promise.all([laadBons(), laadAgenda(), laadPlanning(), laadDaglijsten()]).finally(() => setLaden(false))

    const dagSub = supabase
      .channel('daglijst_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daglijsten' }, laadDaglijsten)
      .subscribe()

    const agendaSub = supabase
      .channel('agenda_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agenda_items' }, laadAgenda)
      .subscribe()

    const bonSub = supabase
      .channel('werkbon_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'werkbonnen' }, laadBons)
      .subscribe()

    const planningSub = supabase
      .channel('planning_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'planning_items' }, laadPlanning)
      .subscribe()

    return () => {
      supabase.removeChannel(agendaSub)
      supabase.removeChannel(bonSub)
      supabase.removeChannel(planningSub)
      supabase.removeChannel(dagSub)
    }
  }, [])

  async function voegBonToe(bon) {
    const { data } = await supabase.from('werkbonnen').insert([{
      datum: bon.datum,
      medewerker: bon.medewerker,
      klant: bon.klant,
      projectnummer: bon.projectnummer || null,
      werkbonnummer: bon.werkbonnummer || null,
      omschrijving: bon.omschrijving || null,
      start_tijd: bon.startTijd,
      eind_tijd: bon.eindTijd,
      pauze: bon.pauze,
      uren: bon.uren,
      vertrek: bon.vertrek || null,
      bestemming: bon.bestemming || null,
      kilometers: bon.kilometers || 0,
      heen_terug: bon.heenTerug,
      privaat_voertuig: bon.privaatVoertuig,
      km_totaal: bon.kmTotaal || 0,
      fotos: bon.fotos || [],
    }]).select()
    if (data) setBons(prev => [bonVanDB(data[0]), ...prev])
  }

  async function verwijderBon(id) {
    await supabase.from('werkbonnen').delete().eq('id', id)
    setBons(prev => prev.filter(b => b.id !== id))
  }

  async function updateBonFactuur(id, veld, waarde) {
    const kolom = veld === 'factuurOntvangen' ? 'factuur_ontvangen' : 'factuur_gestuurd'
    await supabase.from('werkbonnen').update({ [kolom]: waarde }).eq('id', id)
    setBons(prev => prev.map(b => b.id === id ? { ...b, [veld]: waarde } : b))
  }

  async function voegAgendaItemToe(item) {
    const { data } = await supabase.from('agenda_items').insert([{
      datum: item.datum,
      medewerker: item.medewerker,
      tijd: item.tijd || null,
      omschrijving: item.omschrijving,
    }]).select()
    if (data) setAgendaItems(prev => [...prev, data[0]])
  }

  async function verwijderAgendaItem(id) {
    await supabase.from('agenda_items').delete().eq('id', id)
    setAgendaItems(prev => prev.filter(a => a.id !== id))
  }

  async function voegPlanningItemToe(item) {
    const { data, error } = await supabase.from('planning_items').insert([{
      datum: item.datum,
      medewerker: item.medewerker,
      omschrijving: item.omschrijving || null,
      afbeelding: item.afbeelding || null,
    }]).select()
    if (error) throw new Error(error.message)
    if (data) setPlanningItems(prev => [data[0], ...prev])
  }

  async function verwijderPlanningItem(id) {
    await supabase.from('planning_items').delete().eq('id', id)
    setPlanningItems(prev => prev.filter(p => p.id !== id))
  }

  async function slaagDaglijstOp({ datum, medewerker, bonnen, kilometers, notities }) {
    const { data, error } = await supabase.from('daglijsten').insert([{
      datum, medewerker,
      bonnen: bonnen || [],
      kilometers: Number(kilometers) || 0,
      notities: notities || null,
      factuur_gestuurd: false,
    }]).select()
    if (error) throw new Error(error.message)
    if (data) setDaglijsten(prev => [data[0], ...prev])
    return data?.[0]
  }

  async function updateDaglijstFactuur(id, waarde) {
    await supabase.from('daglijsten').update({ factuur_gestuurd: waarde }).eq('id', id)
    setDaglijsten(prev => prev.map(d => d.id === id ? { ...d, factuur_gestuurd: waarde } : d))
  }

  async function verwijderDaglijst(id) {
    await supabase.from('daglijsten').delete().eq('id', id)
    setDaglijsten(prev => prev.filter(d => d.id !== id))
  }

  return (
    <WerkbonContext.Provider value={{
      bons, agendaItems, planningItems, daglijsten, laden,
      voegBonToe, verwijderBon, updateBonFactuur,
      voegAgendaItemToe, verwijderAgendaItem,
      voegPlanningItemToe, verwijderPlanningItem,
      slaagDaglijstOp, updateDaglijstFactuur, verwijderDaglijst,
    }}>
      {children}
    </WerkbonContext.Provider>
  )
}

export function useWerkbonnen() {
  return useContext(WerkbonContext)
}

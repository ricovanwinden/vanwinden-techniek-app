import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export const TEAMLEDEN = ['Owen', 'Gurkan']

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
  }
}

export function WerkbonProvider({ children }) {
  const [bons, setBons] = useState([])
  const [agendaItems, setAgendaItems] = useState([])
  const [laden, setLaden] = useState(true)

  async function laadBons() {
    const { data } = await supabase.from('werkbonnen').select('*').order('datum', { ascending: false })
    if (data) setBons(data.map(bonVanDB))
  }

  async function laadAgenda() {
    const { data } = await supabase.from('agenda_items').select('*').order('datum').order('tijd')
    if (data) setAgendaItems(data)
  }

  useEffect(() => {
    Promise.all([laadBons(), laadAgenda()]).finally(() => setLaden(false))

    const agendaSub = supabase
      .channel('agenda_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agenda_items' }, laadAgenda)
      .subscribe()

    const bonSub = supabase
      .channel('werkbon_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'werkbonnen' }, laadBons)
      .subscribe()

    return () => {
      supabase.removeChannel(agendaSub)
      supabase.removeChannel(bonSub)
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

  return (
    <WerkbonContext.Provider value={{
      bons, agendaItems, laden,
      voegBonToe, verwijderBon,
      voegAgendaItemToe, verwijderAgendaItem,
    }}>
      {children}
    </WerkbonContext.Provider>
  )
}

export function useWerkbonnen() {
  return useContext(WerkbonContext)
}

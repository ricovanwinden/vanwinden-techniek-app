import { useState, useEffect } from 'react'

export const TEAMLEDEN = ['Owen', 'Gurkan']

const BONS_KEY = 'werkbonnen_v1'
const AGENDA_KEY = 'werkbon_agenda_v1'

export function useWerkbonnen() {
  const [bons, setBons] = useState(() => {
    try { return JSON.parse(localStorage.getItem(BONS_KEY)) || [] } catch { return [] }
  })

  const [agendaItems, setAgendaItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem(AGENDA_KEY)) || [] } catch { return [] }
  })

  useEffect(() => {
    localStorage.setItem(BONS_KEY, JSON.stringify(bons))
  }, [bons])

  useEffect(() => {
    localStorage.setItem(AGENDA_KEY, JSON.stringify(agendaItems))
  }, [agendaItems])

  function voegBonToe(bon) {
    setBons(prev => [{ ...bon, id: Date.now() }, ...prev])
  }

  function verwijderBon(id) {
    setBons(prev => prev.filter(b => b.id !== id))
  }

  function voegAgendaItemToe(item) {
    setAgendaItems(prev => [...prev, { ...item, id: Date.now() }])
  }

  function verwijderAgendaItem(id) {
    setAgendaItems(prev => prev.filter(a => a.id !== id))
  }

  return { bons, voegBonToe, verwijderBon, agendaItems, voegAgendaItemToe, verwijderAgendaItem }
}

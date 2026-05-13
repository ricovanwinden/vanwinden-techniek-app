import { useState } from 'react'
import { useWerkbonnen, TEAMLEDEN } from '../hooks/useWerkbonnen'

function toDateStr(d) {
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-')
}

function getMaandag(datum) {
  const d = new Date(datum)
  d.setHours(0, 0, 0, 0)
  const dag = d.getDay()
  d.setDate(d.getDate() - (dag === 0 ? 6 : dag - 1))
  return d
}

function getWeekNummer(datum) {
  const d = new Date(Date.UTC(datum.getFullYear(), datum.getMonth(), datum.getDate()))
  const dagNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dagNum)
  const jaarStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d - jaarStart) / 86400000) + 1) / 7)
}

function dagLabel(d) {
  return d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'short' })
}

const LEEG_ITEM = { medewerker: TEAMLEDEN[0], tijd: '', omschrijving: '' }

export default function WeekOverzicht() {
  const { agendaItems, planningItems, voegAgendaItemToe, verwijderAgendaItem } = useWerkbonnen()
  const [weekStart, setWeekStart] = useState(() => getMaandag(new Date()))
  const [toevoegenDag, setToevoegenDag] = useState(null)
  const [nieuwItem, setNieuwItem] = useState(LEEG_ITEM)

  function vorigeWeek() {
    const d = new Date(weekStart); d.setDate(d.getDate() - 7)
    setWeekStart(d); setToevoegenDag(null)
  }

  function volgendeWeek() {
    const d = new Date(weekStart); d.setDate(d.getDate() + 7)
    setWeekStart(d); setToevoegenDag(null)
  }

  function openToevoegen(dagStr) {
    setToevoegenDag(dagStr === toevoegenDag ? null : dagStr)
    setNieuwItem({ ...LEEG_ITEM })
  }

  function slaOp(dagStr) {
    if (!nieuwItem.omschrijving.trim()) return
    voegAgendaItemToe({ ...nieuwItem, datum: dagStr })
    setToevoegenDag(null)
  }

  const vandaagStr = toDateStr(new Date())
  const weekNr = getWeekNummer(weekStart)
  const vandaagIsDezeWeek = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(d.getDate() + i); return toDateStr(d)
  }).includes(vandaagStr)

  // Weeks that have planning items — for quick navigation
  const planningWeken = [...new Set(planningItems.map(p => toDateStr(getMaandag(new Date(p.datum + 'T12:00:00')))))]
    .sort()

  function springNaarDatum(datumStr) {
    setWeekStart(getMaandag(new Date(datumStr + 'T12:00:00')))
    setToevoegenDag(null)
  }

  return (
    <div className="page">
      <h2 className="page-title">Agenda</h2>

      {planningWeken.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center' }}>Planning:</span>
          {planningWeken.map(w => {
            const d = new Date(w + 'T12:00:00')
            const label = d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
            return (
              <button key={w} className="btn btn-ghost btn-sm" onClick={() => springNaarDatum(w)}
                style={{ fontSize: 12 }}>
                🗓️ {label}
              </button>
            )
          })}
        </div>
      )}

      <div className="week-nav">
        <button className="btn btn-ghost btn-sm" onClick={vorigeWeek}>‹ Vorige</button>
        <div style={{ textAlign: 'center' }}>
          <div className="week-label">Week {weekNr}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {weekStart.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })}
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={volgendeWeek}>Volgende ›</button>
      </div>

      <div className="dag-lijst">
        {Array.from({ length: 7 }, (_, i) => {
          const dag = new Date(weekStart)
          dag.setDate(dag.getDate() + i)
          const dagStr = toDateStr(dag)
          const isVandaag = dagStr === vandaagStr
          const isOpen = toevoegenDag === dagStr

          const dagAgenda = agendaItems
            .filter(a => a.datum === dagStr)
            .sort((a, b) => (a.tijd || '99:99').localeCompare(b.tijd || '99:99'))

          const dagPlanning = planningItems.filter(p => p.datum === dagStr)

          const totaal = dagAgenda.length + dagPlanning.length

          return (
            <div key={dagStr} className={['dag-kaart', isVandaag ? 'vandaag' : '', totaal === 0 && !isOpen ? 'leeg' : ''].join(' ')}>
              <div className="dag-header">
                <span className="dag-naam">{dagLabel(dag)}</span>
                <button
                  className={['btn btn-ghost btn-sm agenda-plus', isOpen ? 'active' : ''].join(' ')}
                  onClick={() => openToevoegen(dagStr)}
                >
                  {isOpen ? '×' : '+'}
                </button>
              </div>

              {/* Agenda items */}
              {dagAgenda.map(item => (
                <div key={item.id} className="agenda-item">
                  <div className="agenda-item-left">
                    {item.tijd && <span className="agenda-tijd">{item.tijd}</span>}
                    <span className="agenda-omschrijving">{item.omschrijving}</span>
                  </div>
                  <div className="agenda-item-right">
                    <span className="agenda-badge">{item.medewerker}</span>
                    <button className="agenda-delete" onClick={() => verwijderAgendaItem(item.id)}>×</button>
                  </div>
                </div>
              ))}

              {/* Planning items van die dag */}
              {dagPlanning.map(item => (
                <div key={item.id} className="agenda-item" style={{ borderLeft: '3px solid var(--primary)' }}>
                  <div className="agenda-item-left">
                    <span className="agenda-omschrijving">🗓️ {item.omschrijving || 'Planning'}</span>
                  </div>
                  <div className="agenda-item-right">
                    <span className="agenda-badge">{item.medewerker}</span>
                  </div>
                </div>
              ))}

              {totaal === 0 && !isOpen && <p className="geen-bons">Niets gepland</p>}

              {/* Inline toevoegformulier */}
              {isOpen && (
                <div className="agenda-form">
                  <select
                    value={nieuwItem.medewerker}
                    onChange={e => setNieuwItem(p => ({ ...p, medewerker: e.target.value }))}
                  >
                    {TEAMLEDEN.map(t => <option key={t}>{t}</option>)}
                  </select>
                  <input
                    type="time"
                    value={nieuwItem.tijd}
                    onChange={e => setNieuwItem(p => ({ ...p, tijd: e.target.value }))}
                  />
                  <input
                    type="text"
                    value={nieuwItem.omschrijving}
                    onChange={e => setNieuwItem(p => ({ ...p, omschrijving: e.target.value }))}
                    placeholder="Omschrijving…"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && slaOp(dagStr)}
                  />
                  <div className="agenda-form-btns">
                    <button className="btn btn-primary btn-sm" onClick={() => slaOp(dagStr)}
                      disabled={!nieuwItem.omschrijving.trim()}>
                      Toevoegen
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setToevoegenDag(null)}>
                      Annuleer
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {!vandaagIsDezeWeek && (
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => { setWeekStart(getMaandag(new Date())); setToevoegenDag(null) }}>
            Naar huidige week
          </button>
        </div>
      )}
    </div>
  )
}

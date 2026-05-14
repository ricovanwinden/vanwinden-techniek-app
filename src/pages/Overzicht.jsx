import { useState } from 'react'
import { useWerkbonnen } from '../hooks/useWerkbonnen'

function BevestigVerwijder({ onJa, onNee }) {
  return (
    <div className="verwijder-bevestig">
      <span>Zeker weten?</span>
      <button className="btn btn-sm" style={{ background: 'var(--danger)', color: 'white' }} onClick={onJa}>Ja, verwijder</button>
      <button className="btn btn-ghost btn-sm" onClick={onNee}>Annuleer</button>
    </div>
  )
}

const OWNER_PASS = import.meta.env.VITE_OWNER_PASSWORD || 'vwt2026'

function formatDatum(d) {
  return new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function Overzicht() {
  const { bons, daglijsten, laden, verwijderBon, updateBonFactuur, updateDaglijstFactuur, verwijderDaglijst } = useWerkbonnen()
  const [ingelogd, setIngelogd] = useState(false)
  const [wachtwoord, setWachtwoord] = useState('')
  const [fout, setFout] = useState(false)
  const [filter, setFilter] = useState('alles')
  const [verwijderBevestig, setVerwijderBevestig] = useState(null)

  function login() {
    if (wachtwoord === OWNER_PASS) { setIngelogd(true); setFout(false) }
    else setFout(true)
  }

  if (!ingelogd) {
    return (
      <div className="page">
        <h2 className="page-title">Eigenaar overzicht</h2>
        <div className="card">
          <h3>Inloggen</h3>
          <div className="field">
            <label className="field-label">Wachtwoord</label>
            <input
              type="password"
              value={wachtwoord}
              onChange={e => setWachtwoord(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && login()}
              placeholder="Wachtwoord"
              autoFocus
            />
          </div>
          {fout && <p style={{ color: 'var(--danger)', fontSize: 14, marginTop: 8 }}>Verkeerd wachtwoord</p>}
          <div className="mt-12">
            <button className="btn btn-primary btn-large" onClick={login}>Inloggen</button>
          </div>
        </div>
      </div>
    )
  }

  const gefilterdeBons = filter === 'alles' ? bons : bons.filter(b => b.medewerker === filter)

  const medewerkers = [...new Set(bons.map(b => b.medewerker))]

  const totalen = medewerkers.map(naam => {
    const mb = bons.filter(b => b.medewerker === naam)
    return {
      naam,
      uren: mb.reduce((s, b) => s + (b.uren || 0), 0),
      km: mb.reduce((s, b) => s + (b.kmTotaal || 0), 0),
      privaatKm: mb.filter(b => b.privaatVoertuig).reduce((s, b) => s + (b.kmTotaal || 0), 0),
      bons: mb.length,
    }
  })

  return (
    <div className="page">
      <div className="overzicht-header">
        <h2 className="page-title">Overzicht</h2>
        <button className="btn btn-ghost btn-sm" onClick={() => setIngelogd(false)}>Uitloggen</button>
      </div>

      {laden ? (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 32 }}>Laden…</p>
      ) : (
        <>
          {/* Totalen per medewerker */}
          <section className="card">
            <h3>Totalen</h3>
            {totalen.length === 0 && <p className="geen-bons">Nog geen werkbonnen</p>}
            {totalen.map(t => (
              <div key={t.naam} className="overzicht-totaal-rij">
                <span className="overzicht-naam">{t.naam}</span>
                <div className="overzicht-cijfers">
                  <span><strong>{t.uren.toFixed(1)}</strong> uur</span>
                  <span><strong>{t.bons}</strong> bons</span>
                  <span><strong>{t.km}</strong> km</span>
                  {t.privaatKm > 0 && (
                    <span className="priv-badge">🚗 {t.privaatKm} km privé</span>
                  )}
                </div>
              </div>
            ))}
          </section>

          {/* Filter */}
          <div className="overzicht-filter">
            <button className={`btn btn-sm ${filter === 'alles' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('alles')}>
              Iedereen
            </button>
            {medewerkers.map(m => (
              <button key={m} className={`btn btn-sm ${filter === m ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(m)}>
                {m}
              </button>
            ))}
          </div>

          {/* Daglijsten */}
          <section className="card">
            <h3>Daglijsten ({daglijsten.length})</h3>
            {daglijsten.length === 0 && <p className="geen-bons">Nog geen daglijsten ingediend</p>}
            {daglijsten.map(dag => {
              const bonnen = dag.bonnen || []
              return (
                <div key={dag.id} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: 16, marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>
                        {dag.medewerker} — {formatDatum(dag.datum)}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                        {bonnen.length} bon{bonnen.length !== 1 ? 'nen' : ''} · {dag.kilometers || 0} km
                      </div>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: dag.factuur_gestuurd ? '#166534' : '#64748b' }}>
                      <input
                        type="checkbox"
                        checked={dag.factuur_gestuurd || false}
                        onChange={e => updateDaglijstFactuur(dag.id, e.target.checked)}
                      />
                      Factuur gestuurd
                    </label>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: dag.notities ? 8 : 0 }}>
                    {bonnen.map((bon, i) => (
                      <span key={i} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontFamily: 'monospace', fontWeight: 600 }}>
                        {[bon.projectcode, bon.wonummer].filter(Boolean).join(' / ')}
                      </span>
                    ))}
                  </div>
                  {dag.notities && <p style={{ fontSize: 13, color: '#475569', margin: '6px 0 0', fontStyle: 'italic' }}>{dag.notities}</p>}
                  <button className="btn btn-ghost btn-sm mt-8" style={{ color: 'var(--danger)', marginTop: 8 }}
                    onClick={() => { if (confirm('Daglijst verwijderen?')) verwijderDaglijst(dag.id) }}>
                    Verwijder
                  </button>
                </div>
              )
            })}
          </section>

          {/* Alle werkbonnen gegroepeerd per dag */}
          <section className="card">
            <h3>{gefilterdeBons.length} werkbonnen</h3>
            {gefilterdeBons.length === 0 && <p className="geen-bons">Geen resultaten</p>}
            {Object.entries(
              gefilterdeBons.reduce((acc, bon) => {
                if (!acc[bon.datum]) acc[bon.datum] = []
                acc[bon.datum].push(bon)
                return acc
              }, {})
            )
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([datum, dagBons]) => {
                const dagUren = dagBons.reduce((s, b) => s + (b.uren || 0), 0)
                const dagKm = dagBons.reduce((s, b) => s + (b.kmTotaal || 0), 0)
                return (
                  <div key={datum} className="dag-groep">
                    <div className="dag-groep-header">
                      <span className="dag-groep-datum">{formatDatum(datum)}</span>
                      <div className="dag-groep-totalen">
                        <span><strong>{dagUren.toFixed(1)}</strong> uur</span>
                        <span><strong>{dagBons.length}</strong> {dagBons.length === 1 ? 'bon' : 'bons'}</span>
                        {dagKm > 0 && <span><strong>{dagKm}</strong> km</span>}
                      </div>
                    </div>
                    {dagBons.map(bon => (
                      <div key={bon.id} className="overzicht-bon">
                        <div className="overzicht-bon-header">
                          <span className="agenda-badge agenda-badge-bon">{bon.medewerker}</span>
                          {(bon.projectnummer || bon.werkbonnummer) && (
                            <div className="overzicht-bon-nummers" style={{ margin: 0 }}>
                              {bon.projectnummer && <span className="bon-nr-badge">📋 {bon.projectnummer}</span>}
                              {bon.werkbonnummer && <span className="bon-nr-badge bon-nr-wo">{bon.werkbonnummer}</span>}
                            </div>
                          )}
                        </div>
                        {bon.klant && <div className="overzicht-bon-titel">{bon.klant}</div>}
                        <div className="overzicht-bon-detail">
                          <span>{(bon.uren || 0).toFixed(1)} uur</span>
                          {bon.kmTotaal > 0 && (
                            <span>{bon.kmTotaal} km{bon.privaatVoertuig ? ' 🚗' : ' 🏢'}</span>
                          )}
                        </div>
                        {bon.omschrijving && <p className="overzicht-omschrijving">{bon.omschrijving}</p>}
                        <div className="factuur-vinkjes">
                          <label className="factuur-vinkje">
                            <input type="checkbox" checked={bon.factuurOntvangen || false}
                              onChange={e => updateBonFactuur(bon.id, 'factuurOntvangen', e.target.checked)} />
                            Factuur ontvangen
                          </label>
                          <label className="factuur-vinkje">
                            <input type="checkbox" checked={bon.factuurGestuurd || false}
                              onChange={e => updateBonFactuur(bon.id, 'factuurGestuurd', e.target.checked)} />
                            Factuur gestuurd
                          </label>
                        </div>
                        {verwijderBevestig === bon.id
                          ? <BevestigVerwijder
                              onJa={() => { verwijderBon(bon.id); setVerwijderBevestig(null) }}
                              onNee={() => setVerwijderBevestig(null)}
                            />
                          : <button className="btn btn-ghost btn-sm mt-8" style={{ color: 'var(--danger)' }}
                              onClick={() => setVerwijderBevestig(bon.id)}>
                              Verwijder
                            </button>
                        }
                      </div>
                    ))}
                  </div>
                )
              })
            }
          </section>
        </>
      )}
    </div>
  )
}

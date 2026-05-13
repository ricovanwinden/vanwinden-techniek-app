import { useState } from 'react'
import { useWerkbonnen, TEAMLEDEN } from '../hooks/useWerkbonnen'

function formatDatum(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}

async function leesUitMetAI(base64, fileType) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('Geen API key. Voeg VITE_ANTHROPIC_API_KEY toe aan .env')

  const data = base64.split(',')[1]
  const isPDF = fileType === 'application/pdf'

  const contentBlock = isPDF
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } }
    : { type: 'image', source: { type: 'base64', media_type: fileType, data } }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: [
          contentBlock,
          {
            type: 'text',
            text: `Dit is een week- of maandplanning van een technisch bedrijf. De medewerkers heten: ${TEAMLEDEN.join(', ')}.
Zoek: de datum van de planning (als weekplanning: de maandag van die week; als maandplanning: de eerste dag van de maand) en welke medewerker het betreft.
Geef de datum als YYYY-MM-DD formaat. Als je niet zeker bent van de datum, neem dan een redelijke schatting.
Antwoord ALLEEN met JSON: {"datum": "YYYY-MM-DD", "medewerker": "naam", "omschrijving": "korte samenvatting van de planning"}.
Gebruik null als iets niet gevonden is.`
          }
        ]
      }]
    })
  })

  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.message || 'API fout')
  const match = (json.content?.[0]?.text || '').match(/\{[\s\S]*?\}/)
  return match ? JSON.parse(match[0]) : {}
}

export default function Planning() {
  const { planningItems, voegPlanningItemToe, verwijderPlanningItem } = useWerkbonnen()

  const [afbeelding, setAfbeelding] = useState(null)
  const [uitlezen, setUitlezen] = useState(false)
  const [uitgelezen, setUitgelezen] = useState(false)
  const [datum, setDatum] = useState('')
  const [medewerker, setMedewerker] = useState(TEAMLEDEN[0])
  const [omschrijving, setOmschrijving] = useState('')
  const [opgeslagen, setOpgeslagen] = useState(false)
  const [verwijderBevestig, setVerwijderBevestig] = useState(null)

  function laadAfbeelding(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async ev => {
      const base64 = ev.target.result
      setAfbeelding({ base64, type: file.type, name: file.name })
      setUitgelezen(false)
      setDatum('')
      setOmschrijving('')

      setUitlezen(true)
      try {
        const result = await leesUitMetAI(base64, file.type)
        if (result.datum) setDatum(result.datum)
        if (result.medewerker) setMedewerker(result.medewerker)
        if (result.omschrijving) setOmschrijving(result.omschrijving)
        setUitgelezen(true)
      } catch (err) {
        alert(`Uitlezen mislukt: ${err.message}`)
      } finally {
        setUitlezen(false)
      }
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  async function opslaan() {
    await voegPlanningItemToe({ datum, medewerker, omschrijving, afbeelding: afbeelding?.base64 || null })
    setAfbeelding(null)
    setDatum('')
    setOmschrijving('')
    setUitgelezen(false)
    setOpgeslagen(true)
    setTimeout(() => setOpgeslagen(false), 3000)
  }

  return (
    <div className="page">
      <h2 className="page-title">Planning</h2>

      {/* Upload sectie */}
      <section className="card">
        <h3>Planning toevoegen</h3>

        {afbeelding ? (
          <div className="werkbon-doc">
            <img
              src={afbeelding.base64}
              alt="Planning"
              style={{ width: '100%', borderRadius: 8, marginBottom: 12, maxHeight: 200, objectFit: 'cover' }}
            />
            <span className="werkbon-naam">📅 {afbeelding.name}</span>
            {uitlezen && <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 8 }}>✨ Bezig met uitlezen…</p>}
            {uitgelezen && <p className="uitgelezen-msg">✓ Datum en medewerker ingevuld</p>}
            <div className="werkbon-acties" style={{ marginTop: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => { setAfbeelding(null); setUitgelezen(false) }}>
                Verwijder
              </button>
            </div>
          </div>
        ) : (
          <label className="btn btn-ghost" htmlFor="planning-input">
            📸 Planning uploaden (foto of screenshot)
          </label>
        )}
        <input id="planning-input" type="file" accept="image/*,application/pdf"
          style={{ display: 'none' }} onChange={laadAfbeelding} />

        {afbeelding && (
          <div style={{ marginTop: 16 }}>
            <div className="field">
              <label className="field-label">Datum</label>
              <input type="date" value={datum} onChange={e => setDatum(e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">Medewerker</label>
              <select value={medewerker} onChange={e => setMedewerker(e.target.value)}>
                {TEAMLEDEN.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="field-label">Omschrijving</label>
              <input type="text" value={omschrijving} onChange={e => setOmschrijving(e.target.value)} placeholder="Week- of maandplanning…" />
            </div>
            <div className="submit-area" style={{ marginTop: 12 }}>
              {opgeslagen && <p className="success-msg">✓ Planning opgeslagen!</p>}
              <button className="btn btn-primary" onClick={opslaan} disabled={!datum || uitlezen}>
                Planning opslaan
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Opgeslagen planningen */}
      <section className="card">
        <h3>{planningItems.length} planningen</h3>
        {planningItems.length === 0 && <p className="geen-bons">Nog geen planningen toegevoegd</p>}
        {planningItems.map(item => (
          <div key={item.id} className="overzicht-bon">
            <div className="overzicht-bon-header">
              <span className="overzicht-datum">{formatDatum(item.datum)}</span>
              <span className="agenda-badge agenda-badge-bon">{item.medewerker}</span>
            </div>
            {item.omschrijving && <p className="overzicht-omschrijving">{item.omschrijving}</p>}
            {item.afbeelding && (
              <img
                src={item.afbeelding}
                alt="Planning"
                style={{ width: '100%', borderRadius: 8, marginTop: 8, maxHeight: 120, objectFit: 'cover', cursor: 'pointer' }}
                onClick={() => window.open(item.afbeelding)}
              />
            )}
            {verwijderBevestig === item.id ? (
              <div className="verwijder-bevestig">
                <span>Zeker weten?</span>
                <button className="btn btn-sm" style={{ background: 'var(--danger)', color: 'white' }}
                  onClick={() => { verwijderPlanningItem(item.id); setVerwijderBevestig(null) }}>
                  Ja, verwijder
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setVerwijderBevestig(null)}>Annuleer</button>
              </div>
            ) : (
              <button className="btn btn-ghost btn-sm mt-8" style={{ color: 'var(--danger)' }}
                onClick={() => setVerwijderBevestig(item.id)}>
                Verwijder
              </button>
            )}
          </div>
        ))}
      </section>
    </div>
  )
}

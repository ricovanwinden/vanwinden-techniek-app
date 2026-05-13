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
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          contentBlock,
          {
            type: 'text',
            text: `Dit is een week- of maandplanning. Haal ALLE afzonderlijke regels/items op.
Voor elke regel geef je:
- datum: in YYYY-MM-DD formaat (datums staan vaak als DD-MM-YYYY)
- medewerker: de naam van de medewerker (gebruik alleen de voornaam, bijv. "Gurkan" of "Owen")
- omschrijving: project/locatie naam + eventueel werkbonnummer

Antwoord ALLEEN met JSON in dit formaat:
{"medewerker": "voornaam", "items": [{"datum": "YYYY-MM-DD", "omschrijving": "..."}, ...]}

Zet geen duplicaten voor dezelfde datum+project combinatie. Converteer DD-MM-YYYY naar YYYY-MM-DD.`
          }
        ]
      }]
    })
  })

  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.message || 'API fout')
  const text = json.content?.[0]?.text || ''
  const match = text.match(/\{[\s\S]*\}/)
  return match ? JSON.parse(match[0]) : {}
}

export default function Planning() {
  const { planningItems, voegPlanningItemToe, verwijderPlanningItem } = useWerkbonnen()

  const [afbeelding, setAfbeelding] = useState(null)
  const [uitlezen, setUitlezen] = useState(false)
  const [uitgelezen, setUitgelezen] = useState(false)
  const [extractedItems, setExtractedItems] = useState([])
  const [extractedMedewerker, setExtractedMedewerker] = useState(TEAMLEDEN[0])
  const [opslaan, setOpslaan] = useState(false)
  const [verwijderBevestig, setVerwijderBevestig] = useState(null)

  function laadAfbeelding(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async ev => {
      const base64 = ev.target.result
      setAfbeelding({ base64, type: file.type, name: file.name })
      setUitgelezen(false)
      setExtractedItems([])
      setOpslaan(false)

      setUitlezen(true)
      try {
        const result = await leesUitMetAI(base64, file.type)
        const medewerker = result.medewerker || ''
        // Match op voornaam: "Gurkan Soydemir" → "Gurkan"
        const match = TEAMLEDEN.find(t =>
          medewerker.toLowerCase().includes(t.toLowerCase())
        ) || TEAMLEDEN[0]
        setExtractedMedewerker(match)
        setExtractedItems((result.items || []).map((item, i) => ({ ...item, id: i, medewerker: match, geselecteerd: true })))
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

  function toggleItem(id) {
    setExtractedItems(prev => prev.map(item => item.id === id ? { ...item, geselecteerd: !item.geselecteerd } : item))
  }

  function updateItem(id, field, value) {
    setExtractedItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item))
  }

  async function slaAllesOp() {
    setOpslaan(true)
    const geselecteerd = extractedItems.filter(i => i.geselecteerd && i.datum)
    for (const item of geselecteerd) {
      await voegPlanningItemToe({ datum: item.datum, medewerker: item.medewerker, omschrijving: item.omschrijving })
    }
    setAfbeelding(null)
    setExtractedItems([])
    setUitgelezen(false)
    setOpslaan(false)
  }

  const geselecteerdAantal = extractedItems.filter(i => i.geselecteerd).length

  return (
    <div className="page">
      <h2 className="page-title">Planning</h2>

      {/* Upload sectie */}
      <section className="card">
        <h3>Planning uploaden</h3>

        {!afbeelding && (
          <label className="btn btn-ghost" htmlFor="planning-input">
            📸 Foto of PDF uploaden
          </label>
        )}

        {afbeelding && !uitgelezen && (
          <div className="werkbon-doc">
            <span className="werkbon-naam">📄 {afbeelding.name}</span>
            {uitlezen && <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 8 }}>✨ Bezig met uitlezen…</p>}
          </div>
        )}

        {uitgelezen && extractedItems.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                ✓ {extractedItems.length} items gevonden voor <strong>{extractedMedewerker}</strong>
              </span>
              <button className="btn btn-ghost btn-sm" onClick={() => { setAfbeelding(null); setExtractedItems([]); setUitgelezen(false) }}>
                Annuleer
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16, maxHeight: 400, overflowY: 'auto' }}>
              {extractedItems.map(item => (
                <div key={item.id} style={{
                  display: 'flex', gap: 8, alignItems: 'flex-start',
                  padding: '8px 10px', borderRadius: 8,
                  background: item.geselecteerd ? 'var(--bg)' : 'transparent',
                  opacity: item.geselecteerd ? 1 : 0.4,
                  border: '1px solid var(--border)'
                }}>
                  <input
                    type="checkbox"
                    checked={item.geselecteerd}
                    onChange={() => toggleItem(item.id)}
                    style={{ marginTop: 3, flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <input
                      type="date"
                      value={item.datum}
                      onChange={e => updateItem(item.id, 'datum', e.target.value)}
                      style={{ fontSize: 13 }}
                    />
                    <input
                      type="text"
                      value={item.omschrijving}
                      onChange={e => updateItem(item.id, 'omschrijving', e.target.value)}
                      style={{ fontSize: 13 }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              className="btn btn-primary btn-large"
              onClick={slaAllesOp}
              disabled={opslaan || geselecteerdAantal === 0}
            >
              {opslaan ? 'Bezig…' : `${geselecteerdAantal} items in agenda zetten`}
            </button>
          </div>
        )}

        <input id="planning-input" type="file" accept="image/*,application/pdf"
          style={{ display: 'none' }} onChange={laadAfbeelding} />
      </section>

      {/* Opgeslagen planningen */}
      <section className="card">
        <h3>{planningItems.length} geplande items</h3>
        {planningItems.length === 0 && <p className="geen-bons">Nog geen planningen toegevoegd</p>}
        {planningItems.map(item => (
          <div key={item.id} className="overzicht-bon">
            <div className="overzicht-bon-header">
              <span className="overzicht-datum">{formatDatum(item.datum)}</span>
              <span className="agenda-badge agenda-badge-bon">{item.medewerker}</span>
            </div>
            {item.omschrijving && <p className="overzicht-omschrijving">{item.omschrijving}</p>}
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

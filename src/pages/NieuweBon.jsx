import { useState, useRef } from 'react'
import { useWerkbonnen, TEAMLEDEN } from '../hooks/useWerkbonnen'

const SNELKEUZE = [4, 6, 7.5, 8, 9, 10]

function toDateStr(d) {
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-')
}

function berekenUren(start, eind, pauseMin) {
  if (!start || !eind) return 0
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = eind.split(':').map(Number)
  return Math.max(0, ((eh * 60 + em) - (sh * 60 + sm) - (pauseMin || 0)) / 60)
}

function eindTijdNa(startTijd, uren, pauseMin) {
  const [sh, sm] = startTijd.split(':').map(Number)
  const totaal = sh * 60 + sm + uren * 60 + (pauseMin || 0)
  return `${String(Math.floor(totaal / 60) % 24).padStart(2, '0')}:${String(Math.round(totaal % 60)).padStart(2, '0')}`
}

async function leesUitMetAI(base64, fileType) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('Geen API key. Voeg VITE_ANTHROPIC_API_KEY toe aan .env')

  const isPDF = fileType === 'application/pdf'
  const data = base64.split(',')[1]

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
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: [
          contentBlock,
          { type: 'text', text: 'Dit is een werkbon. Zoek het projectnummer en werkbonnummer. Antwoord ALLEEN met JSON: {"projectnummer": "...", "werkbonnummer": "..."}. Gebruik null als niet gevonden.' }
        ]
      }]
    })
  })

  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.message || 'API fout')
  const match = (json.content?.[0]?.text || '').match(/\{[\s\S]*?\}/)
  return match ? JSON.parse(match[0]) : {}
}

export default function NieuweBon() {
  const { voegBonToe } = useWerkbonnen()

  const [datum, setDatum] = useState(() => toDateStr(new Date()))
  const [medewerker, setMedewerker] = useState(TEAMLEDEN[0])
  const [klant, setKlant] = useState('')
  const [projectnummer, setProjectnummer] = useState('')
  const [werkbonnummer, setWerkbonnummer] = useState('')
  const [omschrijving, setOmschrijving] = useState('')

  const [startTijd, setStartTijd] = useState('08:00')
  const [eindTijd, setEindTijd] = useState('17:00')
  const [pauze, setPauze] = useState(0)

  const [vertrek, setVertrek] = useState('')
  const [bestemming, setBestemming] = useState('')
  const [kilometers, setKilometers] = useState('')
  const [heenTerug, setHeenTerug] = useState(true)
  const [privaatVoertuig, setPrivaatVoertuig] = useState(false)

  const [fotos, setFotos] = useState([])

  const [werkbonDoc, setWerkbonDoc] = useState(null)
  const [uitlezen, setUitlezen] = useState(false)
  const [uitgelezen, setUitgelezen] = useState(false)

  const [opgeslagen, setOpgeslagen] = useState(false)

  const fotoRef = useRef()
  const werkbonRef = useRef()

  const uren = berekenUren(startTijd, eindTijd, pauze)
  const kmTotaal = kilometers ? (heenTerug ? Number(kilometers) * 2 : Number(kilometers)) : 0

  function laadWerkbonDoc(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setWerkbonDoc({ base64: ev.target.result, type: file.type, name: file.name })
    reader.readAsDataURL(file)
    e.target.value = ''
    setUitgelezen(false)
  }

  async function leesUit() {
    if (!werkbonDoc) return
    setUitlezen(true)
    try {
      const result = await leesUitMetAI(werkbonDoc.base64, werkbonDoc.type)
      if (result.projectnummer) setProjectnummer(result.projectnummer)
      if (result.werkbonnummer) setWerkbonnummer(result.werkbonnummer)
      setUitgelezen(true)
    } catch (err) {
      alert(`Uitlezen mislukt: ${err.message}`)
    } finally {
      setUitlezen(false)
    }
  }

  function voegFotoToe(e) {
    Array.from(e.target.files).forEach(file => {
      const reader = new FileReader()
      reader.onload = ev => setFotos(prev => [...prev, ev.target.result])
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  function opslaan() {
    voegBonToe({
      datum, medewerker, klant, projectnummer, werkbonnummer, omschrijving,
      startTijd, eindTijd, pauze, uren,
      vertrek, bestemming, kilometers: Number(kilometers) || 0,
      heenTerug, privaatVoertuig, kmTotaal,
      fotos,
    })
    setKlant(''); setProjectnummer(''); setWerkbonnummer(''); setOmschrijving('')
    setVertrek(''); setBestemming(''); setKilometers('')
    setFotos([]); setWerkbonDoc(null); setUitgelezen(false)
    setOpgeslagen(true)
    setTimeout(() => setOpgeslagen(false), 3000)
  }

  return (
    <div className="page">
      <h2 className="page-title">Nieuwe werkbon</h2>

      {/* Werkbon document */}
      <section className="card">
        <h3>Werkbon document</h3>
        {werkbonDoc ? (
          <div className="werkbon-doc">
            <span className="werkbon-naam">📄 {werkbonDoc.name}</span>
            <div className="werkbon-acties">
              <button className="btn btn-primary btn-sm" onClick={leesUit} disabled={uitlezen}>
                {uitlezen ? 'Bezig…' : uitgelezen ? '✓ Opnieuw uitlezen' : '✨ Automatisch uitlezen'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setWerkbonDoc(null); setUitgelezen(false) }}>
                Verwijder
              </button>
            </div>
            {uitgelezen && <p className="uitgelezen-msg">✓ Projectnummer en werkbonnummer ingevuld</p>}
          </div>
        ) : (
          <label className="btn btn-ghost" htmlFor="werkbon-input">
            📂 Werkbon uploaden (PDF of afbeelding)
          </label>
        )}
        <input id="werkbon-input" ref={werkbonRef} type="file" accept="image/*,application/pdf"
          style={{ display: 'none' }} onChange={laadWerkbonDoc} />
      </section>

      {/* Gegevens */}
      <section className="card">
        <h3>Gegevens</h3>

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

        <div className="row-2">
          <div className="field">
            <label className="field-label">Projectnummer</label>
            <input type="text" value={projectnummer} onChange={e => setProjectnummer(e.target.value)} placeholder="P-2024-001" />
          </div>
          <div className="field">
            <label className="field-label">Werkbonnummer</label>
            <input type="text" value={werkbonnummer} onChange={e => setWerkbonnummer(e.target.value)} placeholder="WB-0042" />
          </div>
        </div>

        <div className="field">
          <label className="field-label">Klant / Project <span className="required">*</span></label>
          <input type="text" value={klant} onChange={e => setKlant(e.target.value)} placeholder="Bijv. Gemeente Rotterdam" />
        </div>

        <div className="field">
          <label className="field-label">Omschrijving</label>
          <textarea value={omschrijving} onChange={e => setOmschrijving(e.target.value)} placeholder="Wat is er gedaan?" rows={3} />
        </div>
      </section>

      {/* Uren */}
      <section className="card">
        <h3>Uren</h3>
        <div className="row-2">
          <div className="field">
            <label className="field-label">Starttijd</label>
            <input type="time" value={startTijd} onChange={e => setStartTijd(e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">Eindtijd</label>
            <input type="time" value={eindTijd} onChange={e => setEindTijd(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label className="field-label">Pauze (min)</label>
          <input type="number" value={pauze} onChange={e => setPauze(Number(e.target.value))} min={0} max={120} step={15} />
        </div>
        <div className="snelkeuze">
          {SNELKEUZE.map(u => (
            <button key={u} className="btn btn-ghost btn-sm" onClick={() => setEindTijd(eindTijdNa(startTijd, u, pauze))}>
              {u}u
            </button>
          ))}
        </div>
        <div className="uren-totaal">{uren.toFixed(1)}<span>uur</span></div>
      </section>

      {/* Kilometers */}
      <section className="card">
        <h3>Kilometers</h3>
        <div className="field">
          <label className="field-label">Vertrekpunt</label>
          <input type="text" value={vertrek} onChange={e => setVertrek(e.target.value)} placeholder="Adres of plaatsnaam" />
        </div>
        <div className="field">
          <label className="field-label">Bestemming</label>
          <input type="text" value={bestemming} onChange={e => setBestemming(e.target.value)} placeholder="Adres of plaatsnaam" />
        </div>
        <div className="field">
          <label className="field-label">Afstand (km)</label>
          <input type="number" value={kilometers} onChange={e => setKilometers(e.target.value)} placeholder="0" min={0} />
        </div>
        <div className="toggle-row">
          <label className="toggle">
            <input type="checkbox" checked={heenTerug} onChange={e => setHeenTerug(e.target.checked)} />
            Heen en terug
          </label>
          <label className="toggle">
            <input type="checkbox" checked={privaatVoertuig} onChange={e => setPrivaatVoertuig(e.target.checked)} />
            Privé voertuig
          </label>
        </div>
        {kmTotaal > 0 && (
          <div className="km-totaal">
            Totaal: <strong>{kmTotaal} km</strong>{privaatVoertuig && ' · privé voertuig'}
          </div>
        )}
      </section>

      {/* Foto's */}
      <section className="card">
        <h3>Foto's</h3>
        {fotos.length > 0 && (
          <div className="foto-grid">
            {fotos.map((f, i) => (
              <div key={i} className="foto-item">
                <img src={f} alt={`Foto ${i + 1}`} />
                <button className="foto-remove" onClick={() => setFotos(p => p.filter((_, j) => j !== i))}>×</button>
              </div>
            ))}
          </div>
        )}
        <label className="btn btn-ghost" htmlFor="foto-input">📷 Foto toevoegen</label>
        <input id="foto-input" ref={fotoRef} type="file" accept="image/*" capture="environment"
          multiple style={{ display: 'none' }} onChange={voegFotoToe} />
      </section>

      <div className="submit-area">
        {opgeslagen && <p className="success-msg">✓ Werkbon opgeslagen!</p>}
        <button className="btn btn-primary btn-large" onClick={opslaan} disabled={!klant.trim()}>
          Werkbon opslaan
        </button>
      </div>
    </div>
  )
}

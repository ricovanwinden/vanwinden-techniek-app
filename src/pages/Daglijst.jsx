import { useState } from 'react'
import { useWerkbonnen, TEAMLEDEN } from '../hooks/useWerkbonnen'

function toDateStr(d) {
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-')
}

async function scanWerkbon(base64, fileType) {
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
          {
            type: 'text',
            text: 'Dit is een werkbon. Zoek: 1) de projectcode (staat VOOR het WO-nummer, bijv. "S095001S"), 2) het WO-nummer (begint met WO, bijv. "WO242131"), 3) de datum. Antwoord ALLEEN met JSON: {"projectcode": "...", "wonummer": "...", "datum": "YYYY-MM-DD"}. Gebruik lege string als niet gevonden.',
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

export default function Daglijst() {
  const { slaagDaglijstOp } = useWerkbonnen()
  const [medewerker, setMedewerker] = useState(TEAMLEDEN[0])
  const [datum, setDatum] = useState(() => toDateStr(new Date()))
  const [bonnen, setBonnen] = useState([])
  const [kilometers, setKilometers] = useState('')
  const [notities, setNotities] = useState('')
  const [scanBezig, setScanBezig] = useState(false)
  const [opslaanBezig, setOpslaanBezig] = useState(false)
  const [melding, setMelding] = useState('')
  const [gekopieerd, setGekopieerd] = useState(false)

  const toonMelding = (tekst, ms = 4000) => {
    setMelding(tekst)
    setTimeout(() => setMelding(''), ms)
  }

  async function verwerkBestand(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setScanBezig(true)
    toonMelding('Werkbon wordt gelezen...', 30000)

    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = ev => resolve(ev.target.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const result = await scanWerkbon(base64, file.type)
      const bon = {
        id: Date.now(),
        projectcode: result.projectcode || '',
        wonummer: result.wonummer || '',
        datum: result.datum || datum,
      }
      setBonnen(prev => [...prev, bon])
      toonMelding(`✅ Toegevoegd: ${bon.projectcode || bon.wonummer || 'werkbon'}`)
    } catch (err) {
      toonMelding(`❌ ${err.message}`)
    }

    setScanBezig(false)
  }

  function verwijderBon(id) {
    setBonnen(prev => prev.filter(b => b.id !== id))
  }

  async function opslaan() {
    if (bonnen.length === 0) { toonMelding('⚠️ Scan eerst werkbonnen.'); return }
    setOpslaanBezig(true)
    toonMelding('Opslaan...', 10000)
    try {
      await slaagDaglijstOp({ datum, medewerker, bonnen, kilometers, notities })
      toonMelding('✅ Daglijst opgeslagen! Eigenaar kan nu factuur maken.')
      setBonnen([])
      setKilometers('')
      setNotities('')
    } catch (err) {
      toonMelding(`❌ ${err.message}`)
    }
    setOpslaanBezig(false)
  }

  function wis() {
    if (!confirm('Daglijst wissen?')) return
    setBonnen([])
    setKilometers('')
    setNotities('')
    toonMelding('✅ Daglijst gewist.')
  }

  const datumLabel = datum ? new Date(datum + 'T12:00').toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' }) : datum

  const samenvatting = [
    `VanWinden Techniek — Daglijst`,
    `Medewerker: ${medewerker}`,
    `Datum: ${datumLabel}`,
    '',
    `Werkbonnen (${bonnen.length}):`,
    ...bonnen.map((b, i) => `${i + 1}. ${[b.projectcode, b.wonummer].filter(Boolean).join(' / ')}`),
    '',
    `Kilometers: ${kilometers || '—'} km`,
    ...(notities ? ['', `Notities:`, notities] : []),
  ].join('\n')

  function kopieer() {
    navigator.clipboard.writeText(samenvatting).catch(() => {})
    setGekopieerd(true)
    setTimeout(() => setGekopieerd(false), 2500)
  }

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(samenvatting)}`

  return (
    <div className="page">
      <h2 className="page-title">Daglijst</h2>

      {/* Medewerker + datum */}
      <section className="card">
        <h3>Wie &amp; wanneer</h3>
        <div className="row-2">
          <div className="field">
            <label className="field-label">Medewerker</label>
            <select value={medewerker} onChange={e => setMedewerker(e.target.value)}>
              {TEAMLEDEN.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="field-label">Datum</label>
            <input type="date" value={datum} onChange={e => setDatum(e.target.value)} />
          </div>
        </div>
      </section>

      {/* Scan knop */}
      <section className="card">
        <h3>Werkbon toevoegen</h3>
        {melding && (
          <p style={{
            marginBottom: 12, padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: melding.startsWith('✅') ? '#f0fdf4' : melding.startsWith('❌') ? '#fef2f2' : '#eff6ff',
            color: melding.startsWith('✅') ? '#166534' : melding.startsWith('❌') ? '#991b1b' : '#1d4ed8',
          }}>
            {melding}
          </p>
        )}
        <label className={`btn ${scanBezig ? 'btn-ghost' : 'btn-primary'} btn-large`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: scanBezig ? 'not-allowed' : 'pointer' }}>
          {scanBezig ? '⏳ Bezig met scannen...' : '📷 Werkbon scannen'}
          <input
            type="file"
            accept="image/*,application/pdf"
            capture="environment"
            style={{ display: 'none' }}
            disabled={scanBezig}
            onChange={verwerkBestand}
          />
        </label>
      </section>

      {/* Lijst gescande bonnen */}
      <section className="card">
        <h3>Gescande werkbonnen ({bonnen.length})</h3>
        {bonnen.length === 0 ? (
          <p style={{ color: '#94a3b8', textAlign: 'center', padding: '12px 0', fontSize: 14 }}>
            Nog geen werkbonnen gescand.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {bonnen.map((bon, i) => (
              <div key={bon.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '11px 14px' }}>
                <span style={{ color: '#94a3b8', fontWeight: 700, fontSize: 13, minWidth: 22 }}>{i + 1}.</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                    {bon.projectcode && (
                      <span style={{ background: '#dbeafe', color: '#1e40af', borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>
                        {bon.projectcode}
                      </span>
                    )}
                    {bon.wonummer && (
                      <span style={{ background: '#dcfce7', color: '#166534', borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>
                        {bon.wonummer}
                      </span>
                    )}
                  </div>
                  {bon.datum && <div style={{ fontSize: 11, color: '#94a3b8' }}>{bon.datum}</div>}
                </div>
                <button onClick={() => verwijderBon(bon.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 18, padding: '0 4px', lineHeight: 1 }}>×</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Kilometers + notities */}
      <section className="card">
        <h3>Kilometers &amp; notities</h3>
        <div className="field">
          <label className="field-label">Kilometers vandaag</label>
          <input
            type="number"
            value={kilometers}
            onChange={e => setKilometers(e.target.value)}
            placeholder="bijv. 245"
            min={0}
          />
        </div>
        <div className="field">
          <label className="field-label">Notities medewerker</label>
          <textarea
            value={notities}
            onChange={e => setNotities(e.target.value)}
            placeholder="Eventuele opmerkingen..."
            rows={3}
          />
        </div>
      </section>

      {/* Versturen */}
      {bonnen.length > 0 && (
        <section className="card">
          <h3>Opslaan &amp; versturen</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              className="btn btn-primary btn-large"
              onClick={opslaan}
              disabled={opslaanBezig}
              style={{ background: '#6366f1' }}
            >
              {opslaanBezig ? '⏳ Bezig...' : '💾 Opslaan voor eigenaar'}
            </button>
            <button className="btn btn-primary btn-large" onClick={kopieer}>
              {gekopieerd ? '✅ Gekopieerd!' : '📋 Kopiëren naar klembord'}
            </button>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-large"
              style={{ background: '#25d366', color: '#fff', textAlign: 'center', textDecoration: 'none', display: 'block', borderRadius: 10, padding: '14px', fontWeight: 700, fontSize: 15 }}
            >
              💬 Versturen via WhatsApp
            </a>
            <button className="btn btn-ghost" onClick={wis} style={{ color: '#dc2626' }}>
              🗑️ Daglijst wissen
            </button>
          </div>
        </section>
      )}
    </div>
  )
}

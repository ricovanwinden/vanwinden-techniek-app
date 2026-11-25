// Vercel serverfunctie: leest een werkbon of planning uit met Claude.
// De Anthropic API key staat alleen hier op de server (ANTHROPIC_API_KEY),
// niet meer in de browsercode. De prompts staan ook hier, zodat deze route
// alleen voor het uitlezen van documenten gebruikt kan worden.

const OPDRACHTEN = {
  daglijst: {
    max_tokens: 300,
    tekst: 'Dit is een werkbon. Zoek: 1) de projectcode (staat VOOR het WO-nummer, bijv. "S095001S"), 2) het WO-nummer (begint met WO, bijv. "WO242131"), 3) de datum. Antwoord ALLEEN met JSON: {"projectcode": "...", "wonummer": "...", "datum": "YYYY-MM-DD"}. Gebruik lege string als niet gevonden.',
  },
  werkbon: {
    max_tokens: 300,
    tekst: 'Dit is een werkbon. Zoek de Projectcode en het werkbonnummer (begint vaak met WO). Bijvoorbeeld: "Projectcode : 5095001S WO242131" → projectnummer = "5095001S", werkbonnummer = "WO242131". Antwoord ALLEEN met JSON: {"projectnummer": "...", "werkbonnummer": "..."}. Gebruik null als niet gevonden.',
  },
  planning: {
    max_tokens: 2000,
    tekst: `Dit is een week- of maandplanning. Haal ALLE afzonderlijke regels/items op.
Voor elke regel geef je:
- datum: in YYYY-MM-DD formaat (datums staan vaak als DD-MM-YYYY)
- medewerker: de naam van de medewerker (gebruik alleen de voornaam, bijv. "Gurkan" of "Owen")
- omschrijving: project/locatie naam + eventueel werkbonnummer

Antwoord ALLEEN met JSON in dit formaat:
{"medewerker": "voornaam", "items": [{"datum": "YYYY-MM-DD", "omschrijving": "..."}, ...]}

Zet geen duplicaten voor dezelfde datum+project combinatie. Converteer DD-MM-YYYY naar YYYY-MM-DD.`,
  },
}

const AFBEELDINGEN = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Alleen POST' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(503).json({ error: 'ANTHROPIC_API_KEY ontbreekt op de server' })

  const { soort, mediaType, data } = req.body || {}
  const opdracht = OPDRACHTEN[soort]
  if (!opdracht) return res.status(400).json({ error: 'Onbekende soort' })
  if (!data || typeof data !== 'string') return res.status(400).json({ error: 'Geen bestand ontvangen' })

  const isPDF = mediaType === 'application/pdf'
  if (!isPDF && !AFBEELDINGEN.includes(mediaType)) {
    return res.status(400).json({ error: 'Alleen PDF, JPEG, PNG, GIF of WebP' })
  }

  const contentBlock = isPDF
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } }
    : { type: 'image', source: { type: 'base64', media_type: mediaType, data } }

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: opdracht.max_tokens,
        messages: [{ role: 'user', content: [contentBlock, { type: 'text', text: opdracht.tekst }] }],
      }),
    })
    const json = await r.json()
    if (!r.ok) {
      console.error('Anthropic fout:', json)
      return res.status(502).json({ error: json.error?.message || 'API fout' })
    }
    return res.status(200).json({ text: json.content?.[0]?.text || '' })
  } catch (err) {
    console.error('AI uitlezen mislukt:', err)
    return res.status(500).json({ error: 'AI uitlezen mislukt' })
  }
}

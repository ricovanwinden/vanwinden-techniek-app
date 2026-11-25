// Stuurt een werkbon/planning naar de serverfunctie /api/ai (zie api/ai.js).
// Foto's worden eerst verkleind: Vercel accepteert maximaal ~4,5 MB per
// aanvraag en Claude verkleint grotere afbeeldingen toch zelf al.

const MAX_ZIJDE = 2000

function verkleinFoto(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const schaal = Math.min(1, MAX_ZIJDE / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * schaal)
      canvas.height = Math.round(img.height * schaal)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = reject
    img.src = dataUrl
  })
}

// soort: 'daglijst' | 'werkbon' | 'planning'. Geeft de tekst van Claude terug.
export async function leesUitMetServer(soort, base64, fileType) {
  const isPDF = fileType === 'application/pdf'
  const dataUrl = isPDF ? base64 : await verkleinFoto(base64)
  const mediaType = isPDF ? 'application/pdf' : 'image/jpeg'

  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ soort, mediaType, data: dataUrl.split(',')[1] }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 413) throw new Error('Bestand te groot (max ca. 3 MB voor PDF)')
    throw new Error(json.error || 'API fout')
  }
  return json.text || ''
}

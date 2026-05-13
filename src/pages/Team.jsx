import { useWerkbonnen, TEAMLEDEN } from '../hooks/useWerkbonnen'

function initialen(naam) {
  return naam.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export default function Team() {
  const { bons } = useWerkbonnen()

  return (
    <div className="page">
      <h2 className="page-title">Team</h2>

      <div className="team-lijst">
        {TEAMLEDEN.map(lid => {
          const lidBons = bons.filter(b => b.medewerker === lid)
          const totaalUren = lidBons.reduce((s, b) => s + (b.uren || 0), 0)
          const totaalKm = lidBons.reduce((s, b) => s + (b.kmTotaal || 0), 0)

          return (
            <div key={lid} className="team-kaart">
              <div className="team-avatar">{initialen(lid)}</div>
              <div className="team-info">
                <h3>{lid}</h3>
                <div className="team-stats">
                  <span>{totaalUren.toFixed(1)} uur</span>
                  <span>{lidBons.length} {lidBons.length === 1 ? 'bon' : 'bons'}</span>
                  {totaalKm > 0 && <span>{totaalKm} km</span>}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {bons.length === 0 && (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 32, fontSize: 15 }}>
          Nog geen werkbonnen opgeslagen.
        </p>
      )}
    </div>
  )
}

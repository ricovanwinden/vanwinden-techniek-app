import { TEAMLEDEN } from '../hooks/useWerkbonnen'

function initialen(naam) {
  return naam.slice(0, 2).toUpperCase()
}

export default function Team() {
  return (
    <div className="page">
      <h2 className="page-title">Team</h2>
      <div className="team-lijst">
        {TEAMLEDEN.map(lid => (
          <div key={lid} className="team-kaart">
            <div className="team-avatar">{initialen(lid)}</div>
            <div className="team-info">
              <h3>{lid}</h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

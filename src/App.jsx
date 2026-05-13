import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { WerkbonProvider } from './context/WerkbonContext'
import NieuweBon from './pages/NieuweBon'
import WeekOverzicht from './pages/WeekOverzicht'
import Planning from './pages/Planning'
import Team from './pages/Team'
import Overzicht from './pages/Overzicht'

export default function App() {
  return (
    <BrowserRouter>
      <WerkbonProvider>
        <div className="app">
          <header className="topbar">
            <img src="/logo.png" alt="VanWinden Techniek" className="topbar-logo" />
            <h1>VanWinden Techniek</h1>
          </header>
          <main className="content">
            <Routes>
              <Route path="/" element={<NieuweBon />} />
              <Route path="/week" element={<WeekOverzicht />} />
              <Route path="/planning" element={<Planning />} />
              <Route path="/team" element={<Team />} />
              <Route path="/overzicht" element={<Overzicht />} />
            </Routes>
          </main>
          <nav className="bottomnav">
            <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <span className="nav-icon">📝</span>
              <span>Werkbon</span>
            </NavLink>
            <NavLink to="/week" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <span className="nav-icon">📅</span>
              <span>Agenda</span>
            </NavLink>
            <NavLink to="/planning" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <span className="nav-icon">🗓️</span>
              <span>Planning</span>
            </NavLink>
            <NavLink to="/team" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <span className="nav-icon">👥</span>
              <span>Team</span>
            </NavLink>
            <NavLink to="/overzicht" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <span className="nav-icon">📊</span>
              <span>Overzicht</span>
            </NavLink>
          </nav>
        </div>
      </WerkbonProvider>
    </BrowserRouter>
  )
}

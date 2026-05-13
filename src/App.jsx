import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import NieuweBon from './pages/NieuweBon'
import WeekOverzicht from './pages/WeekOverzicht'
import Team from './pages/Team'

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <header className="topbar">
          <h1>Werkbon App</h1>
        </header>
        <main className="content">
          <Routes>
            <Route path="/" element={<NieuweBon />} />
            <Route path="/week" element={<WeekOverzicht />} />
            <Route path="/team" element={<Team />} />
          </Routes>
        </main>
        <nav className="bottomnav">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <span className="nav-icon">📝</span>
            <span>Nieuwe bon</span>
          </NavLink>
          <NavLink to="/week" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <span className="nav-icon">📅</span>
            <span>Weekoverzicht</span>
          </NavLink>
          <NavLink to="/team" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <span className="nav-icon">👥</span>
            <span>Team</span>
          </NavLink>
        </nav>
      </div>
    </BrowserRouter>
  )
}

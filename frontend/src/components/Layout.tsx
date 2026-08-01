import { NavLink, Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="layout">
      <header>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.35rem' }}>Obs Trivia game</h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
            Setup · Twitch chat · OBS overlays
          </p>
        </div>
        <nav>
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/settings">Settings</NavLink>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}

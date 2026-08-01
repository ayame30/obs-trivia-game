import { NavLink, Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="layout">
      <header>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.35rem' }}>Stream Trivia</h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
            Setup · Twitch chat · OBS overlays
          </p>
        </div>
        <nav>
          <NavLink to="/" end>
            Dashboard
          </NavLink>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}

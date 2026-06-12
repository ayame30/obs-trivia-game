import { NavLink, Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="layout">
      <header>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.35rem' }}>Stream Trivia</h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
            GraphQL subscriptions · Twitch chat ABCD votes
          </p>
        </div>
        <nav>
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/overlay">OBS overlay</NavLink>
          <NavLink to="/auth">Twitch auth</NavLink>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}

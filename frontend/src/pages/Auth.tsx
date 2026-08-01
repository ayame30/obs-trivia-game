import { Link } from 'react-router-dom';
import { useTwitchAuth } from '../hooks/useTwitchAuth';

const SCOPES = ['openid', 'chat:read', 'chat:edit'].join(' ');

export default function Auth() {
  const { accessToken, login, userId, loading } = useTwitchAuth();
  const clientId = import.meta.env.VITE_TWITCH_CLIENT_ID;
  const redirectUri = encodeURIComponent(`${window.location.origin}/auth`);

  if (!clientId || clientId === 'your_twitch_client_id') {
    return (
      <div className="card">
        <p>
          Set <code>VITE_TWITCH_CLIENT_ID</code> in <code>frontend/.env</code> (same as backend
          TWITCH_CLIENT_ID).
        </p>
      </div>
    );
  }

  if (loading) {
    return <p>Validating Twitch token…</p>;
  }

  if (!accessToken) {
    return (
      <div className="card">
        <h2>Twitch sign-in</h2>
        <p style={{ color: 'var(--muted)' }}>
          OAuth token is used to connect IRC chat for A/B/C/D votes.
        </p>
        <a
          href={`https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=${encodeURIComponent(SCOPES)}`}
        >
          Connect with Twitch
        </a>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Signed in</h2>
      <p>
        <strong>{login}</strong> (id: {userId})
      </p>
      <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
        Token stored in this browser session. Go to the dashboard to connect chat to the trivia
        backend.
      </p>
      <Link to="/">← Dashboard</Link>
    </div>
  );
}

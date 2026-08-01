import { Link } from 'react-router';
import { useMutation } from '@apollo/client/react';
import { useTwitchAuth } from '../hooks/useTwitchAuth';
import { getTwitchClientId, getTwitchOAuthUrl } from '../lib/twitchOAuth';
import { CLEAR_TWITCH_TOKEN } from '../graphql/operations';

export default function Auth() {
  const { accessToken, login, userId, loading, logout } = useTwitchAuth();
  const oauthUrl = getTwitchOAuthUrl('/auth');
  const [clearTwitchToken, { loading: clearing }] = useMutation(CLEAR_TWITCH_TOKEN, {
    onCompleted: () => logout(),
  });

  if (!getTwitchClientId()) {
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
        <a href={oauthUrl ?? '#'} className="setup-step__oauth-link">
          Connect with Twitch
        </a>
      </div>
    );
  }

  const handleLogout = () => {
    if (
      !window.confirm(
        'Log out and remove the Twitch token from this browser and the server database?'
      )
    ) {
      return;
    }
    clearTwitchToken();
  };

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
      <div className="form-actions">
        <Link to="/">← Dashboard</Link>
        <button type="button" className="danger" disabled={clearing} onClick={handleLogout}>
          {clearing ? 'Logging out…' : 'Log out & clear token'}
        </button>
      </div>
    </div>
  );
}

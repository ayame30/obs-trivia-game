import { useState } from 'react';
import DashboardSetup from '../components/DashboardSetup';
import { useTriviaLive } from '../hooks/useTriviaLive';

export default function Dashboard() {
  const { round, setRound, scoreboard, setScoreboard, loading, subError } = useTriviaLive();
  const [actionError, setActionError] = useState<string | null>(null);

  return (
    <>
      {loading && <p style={{ color: 'var(--muted)' }}>Connecting to GraphQL…</p>}
      {subError && <div className="error-banner">Subscription error: {subError}</div>}
      {actionError && (
        <div className="error-banner error-banner--fixed" role="alert">
          <span>{actionError}</span>
          <button type="button" className="secondary" onClick={() => setActionError(null)}>
            Dismiss
          </button>
        </div>
      )}

      <DashboardSetup
        round={round}
        setRound={setRound}
        scoreboard={scoreboard}
        setScoreboard={setScoreboard}
        onActionError={setActionError}
      />
    </>
  );
}

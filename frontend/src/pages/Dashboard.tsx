import DashboardSetup from '../components/DashboardSetup';
import { useTriviaLive } from '../hooks/useTriviaLive';

export default function Dashboard() {
  const { round, setRound, scoreboard, setScoreboard, loading, subError } = useTriviaLive();

  return (
    <>
      {loading && <p style={{ color: 'var(--muted)' }}>Connecting to GraphQL…</p>}
      {subError && <div className="error-banner">Subscription error: {subError}</div>}

      <DashboardSetup
        round={round}
        setRound={setRound}
        scoreboard={scoreboard}
        setScoreboard={setScoreboard}
      />
    </>
  );
}

import { useMutation } from '@apollo/client/react';
import LiveRoundPanel from '../components/LiveRoundPanel';
import ScoreboardEditor from '../components/ScoreboardEditor';
import QuestionManager from '../components/QuestionManager';
import TwitchSetup from '../components/TwitchSetup';
import { useTriviaLive } from '../hooks/useTriviaLive';
import { RESET_SCOREBOARD, RESET_ROUNDS } from '../graphql/operations';
import { useTwitchAuth } from '../hooks/useTwitchAuth';

export default function Dashboard() {
  const { round, setRound, scoreboard, setScoreboard, loading, subError } = useTriviaLive();
  const { accessToken, login } = useTwitchAuth();
  const [resetScoreboard, { loading: resettingScores }] = useMutation(RESET_SCOREBOARD, {
    onCompleted: (res) => setScoreboard(res.resetScoreboard),
  });
  const [resetRounds, { loading: resettingRounds }] = useMutation(RESET_ROUNDS, {
    onCompleted: () => setRound(null),
  });

  const showCorrect = round?.status === 'ended';

  return (
    <>
      {loading && <p style={{ color: 'var(--muted)' }}>Connecting to GraphQL…</p>}
      {subError && <div className="error-banner">Subscription error: {subError}</div>}

      <div className="grid-2">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h2 style={{ margin: 0 }}>Live round</h2>
            <button
              type="button"
              className="secondary"
              disabled={resettingRounds}
              onClick={() => {
                if (
                  window.confirm(
                    'Reset round #? This clears all round history and votes. The next round will start at #1. Active rounds are cancelled without scoring.'
                  )
                ) {
                  resetRounds();
                }
              }}
            >
              Reset round #
            </button>
          </div>
          <LiveRoundPanel round={round} showCorrect={showCorrect} />
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h2 style={{ margin: 0 }}>Scoreboard</h2>
            <button
              type="button"
              className="secondary"
              disabled={resettingScores}
              onClick={() => {
                if (window.confirm('Reset all scores?')) {
                  if (window.confirm('Are you sure??')) {
                    resetScoreboard();
                  }
                }
              }}
            >
              Reset
            </button>
          </div>
          <ScoreboardEditor entries={scoreboard} onSaved={setScoreboard} />
        </div>
      </div>

      <TwitchSetup accessToken={accessToken} channel={login} />

      <QuestionManager activeRound={round} onRoundChange={setRound} />
    </>
  );
}

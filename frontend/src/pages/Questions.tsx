import { useState } from 'react';
import QuestionManager from '../components/QuestionManager';
import { useTriviaLive } from '../hooks/useTriviaLive';

export default function Questions() {
  const { round, setRound, loading, subError } = useTriviaLive();
  const [actionError, setActionError] = useState<string | null>(null);

  return (
    <div className="questions-page">
      {loading && <p className="dashboard__status">Connecting…</p>}
      {subError && <div className="error-banner">Subscription error: {subError}</div>}
      {actionError && (
        <div className="error-banner error-banner--fixed" role="alert">
          <span>{actionError}</span>
          <button type="button" className="secondary" onClick={() => setActionError(null)}>
            Dismiss
          </button>
        </div>
      )}

      <QuestionManager
        activeRound={round}
        onRoundChange={setRound}
        onActionError={setActionError}
      />
    </div>
  );
}

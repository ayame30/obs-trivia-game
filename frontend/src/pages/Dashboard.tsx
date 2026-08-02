import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import DashboardSetup from '../components/DashboardSetup';
import { useTriviaLive } from '../hooks/useTriviaLive';

export default function Dashboard() {
  const { t } = useTranslation();
  const { round, setRound, scoreboard, setScoreboard, loading, subError } = useTriviaLive();
  const [actionError, setActionError] = useState<string | null>(null);

  return (
    <div className="dashboard">
      {loading && <p className="dashboard__status">{t('common.connecting')}</p>}
      {subError && (
        <div className="error-banner">{t('common.subscriptionError', { message: subError })}</div>
      )}
      {actionError && (
        <div className="error-banner error-banner--fixed" role="alert">
          <span>{actionError}</span>
          <button type="button" className="secondary" onClick={() => setActionError(null)}>
            {t('common.dismiss')}
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
    </div>
  );
}

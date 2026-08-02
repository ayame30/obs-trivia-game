import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import QuestionManager from '../components/QuestionManager';
import { useTriviaLive } from '../hooks/useTriviaLive';

export default function Questions() {
  const { t } = useTranslation();
  const { round, setRound, loading, subError } = useTriviaLive();
  const [actionError, setActionError] = useState<string | null>(null);

  return (
    <div className="questions-page">
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

      <QuestionManager
        activeRound={round}
        onRoundChange={setRound}
        onActionError={setActionError}
      />
    </div>
  );
}

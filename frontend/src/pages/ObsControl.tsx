import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@apollo/client/react';
import { FaSyncAlt } from 'react-icons/fa';
import QuestionManager from '../components/QuestionManager';
import ScoreboardEditor from '../components/ScoreboardEditor';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useTriviaLive } from '../hooks/useTriviaLive';
import { RESET_ROUNDS } from '../graphql/operations';

export default function ObsControl() {
  const { t } = useTranslation();
  const { round, setRound, scoreboard, loading, subError } = useTriviaLive();
  const [actionError, setActionError] = useState<string | null>(null);

  const [resetRounds, { loading: resettingRounds }] = useMutation(RESET_ROUNDS, {
    onCompleted: () => setRound(null),
  });

  return (
    <div className="obs-control-page">
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

      <section className="obs-control-page__section card">
        <QuestionManager
          embedded
          streamOnly
          activeRound={round}
          onRoundChange={setRound}
          onActionError={setActionError}
          headerActions={
            <button
              type="button"
              className="secondary"
              disabled={resettingRounds}
              onClick={() => {
                if (window.confirm(t('setup.resetRoundConfirm'))) {
                  resetRounds();
                }
              }}
            >
              <FaSyncAlt aria-hidden />
              {t('setup.resetRound')}
            </button>
          }
        />
      </section>

      <section className="obs-control-page__section card">
        <ScoreboardEditor entries={scoreboard} readOnly />
      </section>

      <footer className="obs-control-page__footer">
        <LanguageSwitcher />
      </footer>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  FaTwitch,
  FaCopy,
  FaExternalLinkAlt,
  FaCheck,
  FaPlug,
  FaRedo,
  FaSignOutAlt,
  FaPaperPlane,
  FaSyncAlt,
} from 'react-icons/fa';
import SetupStep from './SetupStep';
import QuestionManager from './QuestionManager';
import LiveRoundPanel from './LiveRoundPanel';
import ScoreboardEditor from './ScoreboardEditor';
import OverlayOneClickSetup from './OverlayOneClickSetup';
import { useTwitchAuth } from '../hooks/useTwitchAuth';
import { getTwitchClientId, getTwitchOAuthUrl } from '../lib/twitchOAuth';
import {
  GET_TWITCH_CONFIG,
  GET_QUESTIONS,
  SET_TWITCH_TOKEN,
  RECONNECT_TWITCH,
  CLEAR_TWITCH_TOKEN,
  SEND_TWITCH_CHAT_MESSAGE,
  RESET_SCOREBOARD,
  RESET_ROUNDS,
} from '../graphql/operations';
import type {
  GetQuestionsData,
  GetTwitchConfigData,
  ResetScoreboardMutation,
  Round,
  ScoreboardEntry,
} from '../types';

const OVERLAY_ACK_KEY = 'stream_trivia_overlay_ack';

interface DashboardSetupProps {
  round: Round | null;
  setRound: (round: Round | null) => void;
  scoreboard: ScoreboardEntry[];
  setScoreboard: (entries: ScoreboardEntry[]) => void;
  onActionError?: (message: string | null) => void;
}

function useOverlayAcknowledged(): [boolean, () => void] {
  const [acknowledged, setAcknowledged] = useState(
    () => localStorage.getItem(OVERLAY_ACK_KEY) === '1'
  );
  const acknowledge = () => {
    localStorage.setItem(OVERLAY_ACK_KEY, '1');
    setAcknowledged(true);
  };
  return [acknowledged, acknowledge];
}

export default function DashboardSetup({
  round,
  setRound,
  scoreboard,
  setScoreboard,
  onActionError,
}: DashboardSetupProps) {
  const { t } = useTranslation();
  const { accessToken, login, userId, loading: authLoading, logout } = useTwitchAuth();
  const [openStep, setOpenStep] = useState(1);
  const prevCompleteRef = useRef([false, false, false, false]);
  const initializedRef = useRef(false);
  const [testMessage, setTestMessage] = useState(() => t('setup.testMessageDefault'));
  const [testSent, setTestSent] = useState(false);
  const defaultTestMessage = t('setup.testMessageDefault');
  const [overlayAcknowledged, acknowledgeOverlay] = useOverlayAcknowledged();
  const [overlaySetupMode, setOverlaySetupMode] = useState<'oneClick' | 'manual'>('manual');
  const [overlayTutorTab, setOverlayTutorTab] = useState<'obs' | 'streamlabs'>('obs');

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const overlayUrl = `${origin}/overlay/questions`;
  const scoreboardOverlayUrl = `${origin}/overlay/scoreboard`;

  const { data: configData, refetch: refetchConfig } = useQuery<GetTwitchConfigData>(
    GET_TWITCH_CONFIG,
    { pollInterval: 30000 }
  );
  const { data: questionsData } = useQuery<GetQuestionsData>(GET_QUESTIONS, {
    variables: { offset: 0, limit: 1 },
  });
  const config = configData?.twitchConfig;

  const [setToken, { loading: savingToken, error: tokenError }] = useMutation(SET_TWITCH_TOKEN, {
    onCompleted: () => refetchConfig(),
  });
  const [reconnect, { loading: reconnecting }] = useMutation(RECONNECT_TWITCH, {
    onCompleted: () => refetchConfig(),
  });
  const [clearTwitchToken, { loading: clearingToken }] = useMutation(CLEAR_TWITCH_TOKEN, {
    onCompleted: () => {
      logout();
      setTestSent(false);
      refetchConfig();
      setOpenStep(1);
    },
  });
  const [sendChatMessage, { loading: sendingMessage, error: sendError }] = useMutation(
    SEND_TWITCH_CHAT_MESSAGE,
    { onCompleted: () => setTestSent(true) }
  );
  const [resetScoreboard, { loading: resettingScores }] = useMutation<ResetScoreboardMutation>(
    RESET_SCOREBOARD,
    { onCompleted: (res) => setScoreboard(res.resetScoreboard) }
  );
  const [resetRounds, { loading: resettingRounds }] = useMutation(RESET_ROUNDS, {
    onCompleted: () => setRound(null),
  });

  const oauthComplete = Boolean(accessToken && login && !authLoading);
  const chatComplete = Boolean(config?.hasToken && config?.chatConnected && testSent);
  const overlayComplete = overlayAcknowledged;
  const questionsCount = questionsData?.questions?.total ?? 0;
  const showCorrect = round?.status === 'ended';

  const stepComplete = useMemo(
    () => [oauthComplete, chatComplete, overlayComplete, questionsCount > 0],
    [oauthComplete, chatComplete, overlayComplete, questionsCount]
  );

  const firstIncomplete = stepComplete.findIndex((done) => !done);
  const suggestedStep = firstIncomplete === -1 ? 4 : firstIncomplete + 1;

  useEffect(() => {
    if (!initializedRef.current && !authLoading) {
      initializedRef.current = true;
      setOpenStep(suggestedStep);
      prevCompleteRef.current = [...stepComplete];
      return;
    }

    const prev = prevCompleteRef.current;
    for (let i = 0; i < 3; i++) {
      if (stepComplete[i] && !prev[i]) {
        setOpenStep(i + 2);
        break;
      }
    }
    prevCompleteRef.current = [...stepComplete];
  }, [stepComplete, authLoading, suggestedStep]);

  useEffect(() => {
    setTestMessage((prev) => {
      const known = new Set([
        defaultTestMessage,
        'Obs Trivia game chat test — if you see this, votes are ready!',
      ]);
      return known.has(prev) || !prev.trim() ? defaultTestMessage : prev;
    });
  }, [defaultTestMessage]);

  const summaries = [
    oauthComplete ? t('setup.summarySignedIn', { login }) : t('setup.summaryConnectAccount'),
    config?.hasToken
      ? config.chatConnected
        ? testSent
          ? t('setup.summaryConnectedChannel', { channel: config.channel })
          : t('setup.summarySendTest')
        : t('setup.summaryWaitingIrc')
      : t('setup.summaryLinkToken'),
    overlayComplete ? t('setup.summaryOverlaySaved') : t('setup.summaryAddOverlay'),
    questionsCount > 0
      ? t('setup.summaryQuestionsReady', { count: questionsCount })
      : t('setup.summaryAddQuestions'),
  ];

  const saveToken = () => {
    if (!accessToken) return;
    setToken({
      variables: {
        accessToken,
        channel: login || undefined,
      },
    });
  };

  const handleLogout = () => {
    if (
      !window.confirm(t('setup.logoutConfirm'))
    ) {
      return;
    }
    if (config?.hasToken) {
      clearTwitchToken();
    } else {
      logout();
      setTestSent(false);
      setOpenStep(1);
    }
  };

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt(t('setup.copyUrlPrompt'), url);
    }
  };
  const onClickAcknowledgeOverlay = () => {
    acknowledgeOverlay();
    setOpenStep(4);
  };

  const oauthUrl = getTwitchOAuthUrl('/');
  const clientConfigured = Boolean(getTwitchClientId());

  return (
    <div className="setup-wizard">
      <SetupStep
        step={1}
        title={t("setup.stepOauth")}
        summary={summaries[0]}
        complete={oauthComplete}
        open={openStep === 1}
        onToggle={() => setOpenStep(openStep === 1 ? 0 : 1)}
      >
        {!clientConfigured ? (
          <p className="setup-step__hint">
            <Trans
              i18nKey="setup.clientIdHint"
              components={{ code: <code /> }}
            />
          </p>
        ) : authLoading ? (
          <p className="setup-step__hint">{t('setup.validatingToken')}</p>
        ) : oauthComplete ? (
          <>
            <p>
              <Trans i18nKey="setup.signedInAs" values={{ login }} components={{ strong: <strong /> }} />
              {userId ? t('setup.userIdSuffix', { userId }) : null}
            </p>
            <p className="setup-step__hint">{t('setup.oauthStoredHint')}</p>
            <div className="form-actions">
              <button
                type="button"
                className="danger"
                disabled={clearingToken}
                onClick={handleLogout}
              >
                <FaSignOutAlt aria-hidden />
                {clearingToken ? t('setup.loggingOut') : t('setup.logoutClear')}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="setup-step__hint">
              <Trans i18nKey="setup.signInHint" components={{ code: <code /> }} />
            </p>
            {oauthUrl ? (
              <a className="setup-step__oauth-link" href={oauthUrl}>
                <FaTwitch aria-hidden />
                {t('setup.connectTwitch')}
              </a>
            ) : null}
            {config?.hasToken ? (
              <div className="form-actions" style={{ marginTop: '0.75rem' }}>
                <button
                  type="button"
                  className="danger"
                  disabled={clearingToken}
                  onClick={handleLogout}
                >
                  <FaSignOutAlt aria-hidden />
                  {clearingToken ? t('setup.clearing') : t('setup.clearServerToken')}
                </button>
              </div>
            ) : null}
          </>
        )}
      </SetupStep>

      <SetupStep
        step={2}
        title={t("setup.stepChat")}
        summary={summaries[1]}
        complete={chatComplete}
        open={openStep === 2}
        onToggle={() => setOpenStep(openStep === 2 ? 0 : 2)}
      >
        {!oauthComplete ? (
          <p className="setup-step__hint">{t('setup.completeStep1')}</p>
        ) : (
          <>
            {config?.hasToken ? (
              <p>
                <Trans
                  i18nKey="setup.serverLinked"
                  values={{ login: config.login, channel: config.channel }}
                  components={{ strong: <strong /> }}
                />
                {' · '}
                <span
                  className={`status-pill${config.chatConnected ? ' live' : ''}`}
                  style={config.chatConnected ? undefined : { color: 'var(--muted)' }}
                >
                  {config.chatConnected ? t('setup.ircConnected') : t('setup.ircDisconnected')}
                </span>
              </p>
            ) : (
              <p className="setup-step__hint">{t('setup.saveTokenHint')}</p>
            )}

            <div className="form-actions">
              <button type="button" onClick={saveToken} disabled={!accessToken || savingToken}>
                <FaPlug aria-hidden />
                {savingToken
                  ? t('common.saving')
                  : config?.hasToken
                    ? t('setup.updateToken')
                    : t('setup.connectChat')}
              </button>
              {config?.hasToken ? (
                <button
                  type="button"
                  className="secondary"
                  disabled={reconnecting}
                  onClick={() => reconnect()}
                >
                  <FaRedo aria-hidden />
                  {t('setup.reconnectIrc')}
                </button>
              ) : null}
              {(config?.hasToken || oauthComplete) && (
                <button
                  type="button"
                  className="danger"
                  disabled={clearingToken}
                  onClick={handleLogout}
                >
                  <FaSignOutAlt aria-hidden />
                  {clearingToken ? t('setup.loggingOut') : t('setup.logoutClear')}
                </button>
              )}
            </div>

            {tokenError ? <p className="setup-step__error">{tokenError.message}</p> : null}

            {config?.hasToken ? (
              <div className="setup-step__test-chat">
                <label htmlFor="test-chat-message">
                  {t('setup.sendTestLabel', { channel: config.channel })}
                </label>
                <textarea
                  id="test-chat-message"
                  rows={2}
                  value={testMessage}
                  onChange={(e) => {
                    setTestMessage(e.target.value);
                    setTestSent(false);
                  }}
                />
                <div className="form-actions">
                  <button
                    type="button"
                    disabled={!config.chatConnected || sendingMessage || !testMessage.trim()}
                    onClick={() =>
                      sendChatMessage({ variables: { message: testMessage.trim() } })
                    }
                  >
                    <FaPaperPlane aria-hidden />
                    {sendingMessage ? t('setup.sending') : t('setup.sendTestMessage')}
                  </button>
                </div>
                {sendError ? <p className="setup-step__error">{sendError.message}</p> : null}
                {testSent ? (
                  <p className="setup-step__success">{t('setup.testSentSuccess')}</p>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </SetupStep>

      <SetupStep
        step={3}
        title={t("setup.stepOverlay")}
        summary={summaries[2]}
        complete={overlayComplete}
        open={openStep === 3}
        onToggle={() => setOpenStep(openStep === 3 ? 0 : 3)}
      >
        <div className="overlay-setup-mode-tabs" role="tablist" aria-label={t('setup.overlaySetupModes')}>
          <button
            type="button"
            role="tab"
            id="overlay-setup-tab-manual"
            aria-selected={overlaySetupMode === 'manual'}
            aria-controls="overlay-setup-panel"
            className={overlaySetupMode === 'manual' ? 'is-active' : undefined}
            onClick={() => setOverlaySetupMode('manual')}
          >
            {t('setup.overlayModeManual')}
          </button>
          <button
            type="button"
            role="tab"
            id="overlay-setup-tab-oneclick"
            aria-selected={overlaySetupMode === 'oneClick'}
            aria-controls="overlay-setup-panel"
            className={overlaySetupMode === 'oneClick' ? 'is-active' : undefined}
            onClick={() => setOverlaySetupMode('oneClick')}
          >
            {t('setup.overlayModeOneClick')}
          </button>
        </div>

        <div
          id="overlay-setup-panel"
          role="tabpanel"
          aria-labelledby={
            overlaySetupMode === 'oneClick'
              ? 'overlay-setup-tab-oneclick'
              : 'overlay-setup-tab-manual'
          }
        >
          {overlaySetupMode === 'oneClick' ? (
            <OverlayOneClickSetup
              triviaUrl={overlayUrl}
              scoreboardUrl={scoreboardOverlayUrl}
              onOverlaysReady={acknowledgeOverlay}
            />
          ) : (
            <div className="setup-step__overlay-layout">
              <div className="setup-step__overlay-copy">
                <p className="setup-step__hint">
                  <Trans i18nKey="setup.overlayHint1" components={{ strong: <strong /> }} />
                </p>
                <p className="setup-step__hint">
                  <Trans i18nKey="setup.overlayHint2" components={{ strong: <strong /> }} />
                </p>

                <div className="setup-step__url-block">
                  <label>{t('setup.liveOverlay')}</label>
                  <div className="setup-step__url-row">
                    <input type="text" readOnly value={overlayUrl} />
                    <button type="button" className="secondary" onClick={() => copyUrl(overlayUrl)}>
                      <FaCopy aria-hidden />
                      {t('common.copy')}
                    </button>
                    <a
                      href="/overlay/questions"
                      target="_blank"
                      rel="noreferrer"
                      className="setup-step__preview-link"
                    >
                      <FaExternalLinkAlt aria-hidden />
                      {t('common.preview')}
                    </a>
                  </div>
                  <p className="setup-step__hint">{t('setup.liveOverlayHint')}</p>
                </div>

                <div className="setup-step__url-block">
                  <label>{t('setup.scoreboardOverlay')}</label>
                  <div className="setup-step__url-row">
                    <input type="text" readOnly value={scoreboardOverlayUrl} />
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => copyUrl(scoreboardOverlayUrl)}
                    >
                      <FaCopy aria-hidden />
                      {t('common.copy')}
                    </button>
                    <a
                      href="/overlay/scoreboard"
                      target="_blank"
                      rel="noreferrer"
                      className="setup-step__preview-link"
                    >
                      <FaExternalLinkAlt aria-hidden />
                      {t('common.preview')}
                    </a>
                  </div>
                  <p className="setup-step__hint">{t('setup.scoreboardOverlayHint')}</p>
                </div>
              </div>

              <div className="setup-step__tutor">
                <div
                  className="overlay-tutor-tabs"
                  role="tablist"
                  aria-label={t('setup.overlayTutorTabs')}
                >
                  <button
                    type="button"
                    role="tab"
                    id="overlay-tutor-tab-obs"
                    aria-selected={overlayTutorTab === 'obs'}
                    aria-controls="overlay-tutor-panel"
                    className={overlayTutorTab === 'obs' ? 'is-active' : undefined}
                    onClick={() => setOverlayTutorTab('obs')}
                  >
                    {t('setup.overlayTabObs')}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    id="overlay-tutor-tab-streamlabs"
                    aria-selected={overlayTutorTab === 'streamlabs'}
                    aria-controls="overlay-tutor-panel"
                    className={overlayTutorTab === 'streamlabs' ? 'is-active' : undefined}
                    onClick={() => setOverlayTutorTab('streamlabs')}
                  >
                    {t('setup.overlayTabStreamlabs')}
                  </button>
                </div>
                <div
                  className="setup-step__tutor-panel"
                  id="overlay-tutor-panel"
                  role="tabpanel"
                  aria-labelledby={
                    overlayTutorTab === 'obs'
                      ? 'overlay-tutor-tab-obs'
                      : 'overlay-tutor-tab-streamlabs'
                  }
                >
                  <img
                    className="setup-step__tutor-img"
                    src={overlayTutorTab === 'obs' ? '/obs-tutor.png' : '/streamlabs-tutor.png'}
                    alt={
                      overlayTutorTab === 'obs'
                        ? t('setup.overlayTutorAltObs')
                        : t('setup.overlayTutorAltStreamlabs')
                    }
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="form-actions">
          <button type="button" onClick={onClickAcknowledgeOverlay}>
            <FaCheck aria-hidden />
            {t('common.done')}
          </button>
        </div>
      </SetupStep>

      <SetupStep
        step={4}
        title={t("setup.stepStream")}
        summary={summaries[3]}
        complete={questionsCount > 0}
        open={openStep === 4}
        onToggle={() => setOpenStep(openStep === 4 ? 0 : 4)}
      >
        <div className="setup-step__stream-layout">
          <div className="setup-step__stream-main">
            <div className="card setup-step__live-card">
              <div className="setup-step__live-header">
                <h3>{t('setup.liveRoundPreview')}</h3>
                <button
                  type="button"
                  className="secondary"
                  disabled={resettingRounds}
                  onClick={() => {
                    if (
                      window.confirm(t('setup.resetRoundConfirm'))
                    ) {
                      resetRounds();
                    }
                  }}
                >
                  <FaSyncAlt aria-hidden />
                  {t('setup.resetRound')}
                </button>
              </div>
              <LiveRoundPanel round={round} showCorrect={showCorrect} />
            </div>

            <div className="card setup-step__question-card">
              <QuestionManager
                embedded
                activeRound={round}
                onRoundChange={setRound}
                onActionError={onActionError}
              />
            </div>
          </div>

          <div className="card setup-step__stream-scoreboard">
            <ScoreboardEditor
              entries={scoreboard}
              onSaved={setScoreboard}
              resetting={resettingScores}
              onReset={() => {
                resetScoreboard();
              }}
            />
          </div>
        </div>
      </SetupStep>
    </div>
  );
}

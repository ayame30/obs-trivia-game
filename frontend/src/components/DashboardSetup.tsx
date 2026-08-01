import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import SetupStep from './SetupStep';
import QuestionManager from './QuestionManager';
import LiveRoundPanel from './LiveRoundPanel';
import ScoreboardEditor from './ScoreboardEditor';
import { useTwitchAuth } from '../hooks/useTwitchAuth';
import { getTwitchClientId, getTwitchOAuthUrl } from '../lib/twitchOAuth';
import {
  GET_TWITCH_CONFIG,
  GET_QUESTIONS,
  SET_TWITCH_TOKEN,
  RECONNECT_TWITCH,
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
const DEFAULT_TEST_MESSAGE = 'Stream Trivia chat test — if you see this, votes are ready!';

interface DashboardSetupProps {
  round: Round | null;
  setRound: (round: Round | null) => void;
  scoreboard: ScoreboardEntry[];
  setScoreboard: (entries: ScoreboardEntry[]) => void;
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
}: DashboardSetupProps) {
  const { accessToken, login, userId, loading: authLoading } = useTwitchAuth();
  const [openStep, setOpenStep] = useState(1);
  const prevCompleteRef = useRef([false, false, false, false]);
  const initializedRef = useRef(false);
  const [testMessage, setTestMessage] = useState(DEFAULT_TEST_MESSAGE);
  const [testSent, setTestSent] = useState(false);
  const [overlayAcknowledged, acknowledgeOverlay] = useOverlayAcknowledged();

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const overlayUrl = `${origin}/overlay`;
  const scoreboardOverlayUrl = `${origin}/scoreboard-overlay`;

  const { data: configData, refetch: refetchConfig } = useQuery<GetTwitchConfigData>(
    GET_TWITCH_CONFIG,
    { pollInterval: 5000 }
  );
  const { data: questionsData } = useQuery<GetQuestionsData>(GET_QUESTIONS);
  const config = configData?.twitchConfig;

  const [setToken, { loading: savingToken, error: tokenError }] = useMutation(SET_TWITCH_TOKEN, {
    onCompleted: () => refetchConfig(),
  });
  const [reconnect, { loading: reconnecting }] = useMutation(RECONNECT_TWITCH, {
    onCompleted: () => refetchConfig(),
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
  const questionsCount = questionsData?.questions?.length ?? 0;
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

  const summaries = [
    oauthComplete ? `Signed in as ${login}` : 'Connect your broadcaster account',
    config?.hasToken
      ? config.chatConnected
        ? testSent
          ? `Connected to #${config.channel}`
          : 'Send a test message in chat'
        : 'Waiting for IRC connection'
      : 'Link token to the backend',
    overlayComplete ? 'Overlay URLs saved' : 'Add browser sources in OBS',
    questionsCount > 0
      ? `${questionsCount} question${questionsCount === 1 ? '' : 's'} ready`
      : 'Add questions to the bank',
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

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copy this URL:', url);
    }
  };

  const oauthUrl = getTwitchOAuthUrl('/');
  const clientConfigured = Boolean(getTwitchClientId());

  return (
    <div className="setup-wizard">
      <SetupStep
        step={1}
        title="Twitch OAuth"
        summary={summaries[0]}
        complete={oauthComplete}
        open={openStep === 1}
        onToggle={() => setOpenStep(openStep === 1 ? 0 : 1)}
      >
        {!clientConfigured ? (
          <p className="setup-step__hint">
            Set <code>VITE_TWITCH_CLIENT_ID</code> in <code>frontend/.env</code> (same value as backend{' '}
            <code>TWITCH_CLIENT_ID</code>).
          </p>
        ) : authLoading ? (
          <p className="setup-step__hint">Validating Twitch token…</p>
        ) : oauthComplete ? (
          <>
            <p>
              Signed in as <strong>{login}</strong>
              {userId ? ` (id: ${userId})` : null}
            </p>
            <p className="setup-step__hint">
              Your OAuth token is stored in this browser. Continue to step 2 to connect chat on the
              server.
            </p>
          </>
        ) : (
          <>
            <p className="setup-step__hint">
              Sign in with Twitch so the app can read chat votes and post round messages. Scopes:{' '}
              <code>chat:read</code>, <code>chat:edit</code>.
            </p>
            {oauthUrl ? (
              <a className="setup-step__oauth-link" href={oauthUrl}>
                Connect with Twitch
              </a>
            ) : null}
          </>
        )}
      </SetupStep>

      <SetupStep
        step={2}
        title="Test chat connection"
        summary={summaries[1]}
        complete={chatComplete}
        open={openStep === 2}
        onToggle={() => setOpenStep(openStep === 2 ? 0 : 2)}
      >
        {!oauthComplete ? (
          <p className="setup-step__hint">Complete step 1 first.</p>
        ) : (
          <>
            {config?.hasToken ? (
              <p>
                Server linked as <strong>{config.login}</strong> on channel{' '}
                <strong>#{config.channel}</strong>
                {' · '}
                <span
                  className={`status-pill${config.chatConnected ? ' live' : ''}`}
                  style={config.chatConnected ? undefined : { color: 'var(--muted)' }}
                >
                  {config.chatConnected ? 'IRC connected' : 'IRC disconnected'}
                </span>
              </p>
            ) : (
              <p className="setup-step__hint">
                Save your OAuth token on the server so it can join Twitch IRC for A/B/C/D votes.
              </p>
            )}

            <div className="form-actions">
              <button type="button" onClick={saveToken} disabled={!accessToken || savingToken}>
                {savingToken ? 'Saving…' : config?.hasToken ? 'Update token' : 'Connect chat on server'}
              </button>
              {config?.hasToken ? (
                <button
                  type="button"
                  className="secondary"
                  disabled={reconnecting}
                  onClick={() => reconnect()}
                >
                  Reconnect IRC
                </button>
              ) : null}
            </div>

            {tokenError ? <p className="setup-step__error">{tokenError.message}</p> : null}

            {config?.hasToken ? (
              <div className="setup-step__test-chat">
                <label htmlFor="test-chat-message">Send a test message to #{config.channel}</label>
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
                    {sendingMessage ? 'Sending…' : 'Send test message'}
                  </button>
                </div>
                {sendError ? <p className="setup-step__error">{sendError.message}</p> : null}
                {testSent ? (
                  <p className="setup-step__success">
                    Message sent — check your Twitch chat to confirm it appears.
                  </p>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </SetupStep>

      <SetupStep
        step={3}
        title="Add overlay to OBS / Streamlabs"
        summary={summaries[2]}
        complete={overlayComplete}
        open={openStep === 3}
        onToggle={() => setOpenStep(openStep === 3 ? 0 : 3)}
      >
        <p className="setup-step__hint">
          Add each URL as a <strong>Browser Source</strong> in OBS or Streamlabs. Set width ~1920,
          height ~1080, and enable transparent background if your scene needs it.
        </p>

        <div className="setup-step__url-block">
          <label>Live trivia overlay</label>
          <div className="setup-step__url-row">
            <input type="text" readOnly value={overlayUrl} />
            <button type="button" className="secondary" onClick={() => copyUrl(overlayUrl)}>
              Copy
            </button>
            <a href="/overlay" target="_blank" rel="noreferrer" className="setup-step__preview-link">
              Preview
            </a>
          </div>
          <p className="setup-step__hint">Shows the active question, options, countdown, and votes.</p>
        </div>

        <div className="setup-step__url-block">
          <label>Scoreboard overlay</label>
          <div className="setup-step__url-row">
            <input type="text" readOnly value={scoreboardOverlayUrl} />
            <button type="button" className="secondary" onClick={() => copyUrl(scoreboardOverlayUrl)}>
              Copy
            </button>
            <a
              href="/scoreboard-overlay"
              target="_blank"
              rel="noreferrer"
              className="setup-step__preview-link"
            >
              Preview
            </a>
          </div>
          <p className="setup-step__hint">Shows the top scores during your stream.</p>
        </div>

        <div className="form-actions">
          <button type="button" onClick={acknowledgeOverlay}>
            {overlayAcknowledged ? 'Marked as added' : 'I added the overlays'}
          </button>
        </div>
      </SetupStep>

      <SetupStep
        step={4}
        title="Prepare questions & start the stream"
        summary={summaries[3]}
        complete={questionsCount > 0}
        open={openStep === 4}
        onToggle={() => setOpenStep(openStep === 4 ? 0 : 4)}
      >
        <QuestionManager embedded activeRound={round} onRoundChange={setRound} />

        <div className="grid-2 setup-step__live-grid">
          <div className="card setup-step__live-card">
            <div className="setup-step__live-header">
              <h3>Live round preview</h3>
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

          <div className="card setup-step__live-card">
            <div className="setup-step__live-header">
              <h3>Scoreboard</h3>
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
      </SetupStep>
    </div>
  );
}

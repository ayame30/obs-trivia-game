import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { FaSave } from 'react-icons/fa';
import { GET_APP_SETTINGS, UPDATE_APP_SETTINGS } from '../graphql/operations';
import type {
  AppSettingsFormState,
  GetAppSettingsData,
  UpdateAppSettingsMutation,
} from '../types';

const emptyForm: AppSettingsFormState = {
  showQuestionChat: true,
  questionChatTemplate: '',
  showCutoffChat: true,
  cutoffChatMessage: '',
  scoreMultiplier: 10,
  overlayCustomCss: '',
  roundLabelTemplate: '第{{round}}題',
  roundLabelIdle: '第0題',
  idleQuestionText: '即將開始',
  countdownLabel: '倒數時間',
  countdownPausedLabel: '暫停倒數',
  countdownValueTemplate: '{{seconds}}s',
};

function settingsToForm(s: {
  showQuestionChat: boolean;
  questionChatTemplate: string;
  showCutoffChat: boolean;
  cutoffChatMessage: string;
  scoreMultiplier: number;
  overlayCustomCss?: string | null;
  roundLabelTemplate: string;
  roundLabelIdle: string;
  idleQuestionText: string;
  countdownLabel: string;
  countdownPausedLabel: string;
  countdownValueTemplate: string;
}): AppSettingsFormState {
  return {
    showQuestionChat: s.showQuestionChat,
    questionChatTemplate: s.questionChatTemplate,
    showCutoffChat: s.showCutoffChat,
    cutoffChatMessage: s.cutoffChatMessage,
    scoreMultiplier: s.scoreMultiplier,
    overlayCustomCss: s.overlayCustomCss ?? '',
    roundLabelTemplate: s.roundLabelTemplate,
    roundLabelIdle: s.roundLabelIdle,
    idleQuestionText: s.idleQuestionText,
    countdownLabel: s.countdownLabel,
    countdownPausedLabel: s.countdownPausedLabel,
    countdownValueTemplate: s.countdownValueTemplate,
  };
}


/** MCP runs on the Nest API, not the Vite UI port. */
function getMcpServerUrl(): string {
  if (typeof window === 'undefined') {
    return 'http://localhost:4000/mcp';
  }
  const pagePort = window.location.port;
  const apiPort =
    pagePort && pagePort !== '3001'
      ? pagePort
      : String(import.meta.env.VITE_API_PORT || '4000');
  return `http://127.0.0.1:${apiPort}/mcp`;
}

function mcpConfigSnippet(mcpUrl: string): string {
  return JSON.stringify(
    {
      mcpServers: {
        'obs-trivia-game': {
          url: mcpUrl,
        },
      },
    },
    null,
    2
  );
}

export default function Settings() {
  const { data, loading } = useQuery<GetAppSettingsData>(GET_APP_SETTINGS);
  const [form, setForm] = useState<AppSettingsFormState>(emptyForm);
  const [saved, setSaved] = useState(false);
  const mcpUrl = getMcpServerUrl();
  const mcpConfig = mcpConfigSnippet(mcpUrl);

  const [updateSettings, { loading: saving, error }] = useMutation<UpdateAppSettingsMutation>(
    UPDATE_APP_SETTINGS,
    {
      onCompleted: (res) => {
        setForm(settingsToForm(res.updateAppSettings));
        setSaved(true);
      },
    }
  );

  useEffect(() => {
    const s = data?.appSettings;
    if (!s) return;
    setForm(settingsToForm(s));
  }, [data]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSaved(false);
    const multiplier = Number(form.scoreMultiplier);
    if (!Number.isInteger(multiplier) || multiplier <= 0) {
      return;
    }
    updateSettings({
      variables: {
        input: {
          showQuestionChat: form.showQuestionChat,
          questionChatTemplate: form.questionChatTemplate,
          showCutoffChat: form.showCutoffChat,
          cutoffChatMessage: form.cutoffChatMessage,
          scoreMultiplier: multiplier,
          overlayCustomCss: form.overlayCustomCss,
          roundLabelTemplate: form.roundLabelTemplate,
          roundLabelIdle: form.roundLabelIdle,
          idleQuestionText: form.idleQuestionText,
          countdownLabel: form.countdownLabel,
          countdownPausedLabel: form.countdownPausedLabel,
          countdownValueTemplate: form.countdownValueTemplate,
        },
      },
    });
  };

  const multiplierInvalid =
    form.scoreMultiplier === '' ||
    !Number.isInteger(Number(form.scoreMultiplier)) ||
    Number(form.scoreMultiplier) <= 0;

  if (loading && !data) {
    return <p style={{ color: 'var(--muted)' }}>Loading settings…</p>;
  }

  return (
    <div className="card settings-page">
      <h2>Settings</h2>
      <p className="setup-step__hint">
        Configure Twitch chat announcements, score display, overlay labels, and overlay styling.
      </p>

      <form className="form-grid" onSubmit={handleSubmit}>
        <section className="settings-section">
          <h3>Overlay labels</h3>
          <p className="setup-step__hint">
            Text shown on the live round preview and OBS trivia overlay.
          </p>
          <label htmlFor="round-label-template">Active round label</label>
          <input
            id="round-label-template"
            type="text"
            value={form.roundLabelTemplate}
            onChange={(e) => {
              setSaved(false);
              setForm({ ...form, roundLabelTemplate: e.target.value });
            }}
            required
          />
          <p className="setup-step__hint">
            Use <code>{'{{round}}'}</code> for the round id. Default: <code>第{'{{round}}'}題</code>
          </p>
          <label htmlFor="round-label-idle">Idle / placeholder label</label>
          <input
            id="round-label-idle"
            type="text"
            value={form.roundLabelIdle}
            onChange={(e) => {
              setSaved(false);
              setForm({ ...form, roundLabelIdle: e.target.value });
            }}
            required
          />
          <p className="setup-step__hint">
            Shown when no round is active. Default: <code>第0題</code>
          </p>
          <label htmlFor="idle-question-text">Idle question text</label>
          <input
            id="idle-question-text"
            type="text"
            value={form.idleQuestionText}
            onChange={(e) => {
              setSaved(false);
              setForm({ ...form, idleQuestionText: e.target.value });
            }}
            required
          />
          <p className="setup-step__hint">
            Placeholder question body when idle. Default: <code>即將開始</code>
          </p>
          <label htmlFor="countdown-label">Countdown label</label>
          <input
            id="countdown-label"
            type="text"
            value={form.countdownLabel}
            onChange={(e) => {
              setSaved(false);
              setForm({ ...form, countdownLabel: e.target.value });
            }}
            required
          />
          <label htmlFor="countdown-paused-label">Paused countdown label</label>
          <input
            id="countdown-paused-label"
            type="text"
            value={form.countdownPausedLabel}
            onChange={(e) => {
              setSaved(false);
              setForm({ ...form, countdownPausedLabel: e.target.value });
            }}
            required
          />
          <label htmlFor="countdown-value-template">Countdown value</label>
          <input
            id="countdown-value-template"
            type="text"
            value={form.countdownValueTemplate}
            onChange={(e) => {
              setSaved(false);
              setForm({ ...form, countdownValueTemplate: e.target.value });
            }}
            required
          />
          <p className="setup-step__hint">
            Use <code>{'{{seconds}}'}</code> for remaining time. Default:{' '}
            <code>{'{{seconds}}s'}</code>
          </p>
        </section>

        <section className="settings-section">
          <h3>Chat question message</h3>
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={form.showQuestionChat}
              onChange={(e) => setForm({ ...form, showQuestionChat: e.target.checked })}
            />
            Enable
          </label>
          {form.showQuestionChat ? (
            <>
              <label htmlFor="question-chat-template">Message template</label>
              <textarea
                id="question-chat-template"
                rows={6}
                value={form.questionChatTemplate}
                onChange={(e) => setForm({ ...form, questionChatTemplate: e.target.value })}
                required
              />
              <p className="setup-step__hint">
                Placeholders:{' '}
                <code>{'{{round}}'}</code> <code>{'{{question}}'}</code>{' '}
                <code>{'{{answerA}}'}</code> <code>{'{{answerB}}'}</code>{' '}
                <code>{'{{answerC}}'}</code> <code>{'{{answerD}}'}</code>{' '}
                <code>{'{{countDownSecond}}'}</code>
              </p>
              <p className="setup-step__hint">
                Default:{' '}
                <code>
                  {
                    'Q{{round}}:  {{question}} A ) {{answerA}} B ) {{answerB}} C ) {{answerC}} D ) {{answerD}}'
                  }
                </code>
              </p>
            </>
          ) : null}
        </section>

        <section className="settings-section">
          <h3>Chat cutoff message</h3>
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={form.showCutoffChat}
              onChange={(e) => setForm({ ...form, showCutoffChat: e.target.checked })}
            />
            Enable
          </label>
          {form.showCutoffChat ? (
            <>
              <label htmlFor="cutoff-chat-message">Message template</label>
              <textarea
                id="cutoff-chat-message"
                rows={2}
                value={form.cutoffChatMessage}
                onChange={(e) => setForm({ ...form, cutoffChatMessage: e.target.value })}
                required
              />
            </>
          ) : null}
        </section>

        <section className="settings-section">
          <h3>Score multiplier</h3>
          <p className="setup-step__hint">
            Displayed score = stored points × multiplier. Default is 10. Must be a positive integer.
          </p>
          <label htmlFor="score-multiplier">Multiplier</label>
          <input
            id="score-multiplier"
            type="number"
            min={1}
            step={1}
            value={form.scoreMultiplier}
            onChange={(e) => {
              setSaved(false);
              setForm({ ...form, scoreMultiplier: e.target.value });
            }}
            required
          />
          {multiplierInvalid ? (
            <p className="setup-step__error">Score multiplier must be a positive integer (not 0 or negative).</p>
          ) : null}
        </section>

        <section className="settings-section">
          <h3>Overlay custom CSS</h3>
          <p className="setup-step__hint">
            Applied to both the trivia and scoreboard OBS overlays. Prefer selectors from{' '}
            <code>frontend/src/styles/overlay.css</code> (for example <code>.overlay-page</code>,{' '}
            <code>.overlay-card</code>, <code>.live-round-panel</code>, <code>.scoreboard-list</code>
            ). Changes apply within a few seconds (or refresh the browser source).
          </p>
          <p className="setup-step__hint">
            Optional: edit via your own chatbot — with the app running, add this MCP server:
          </p>
          <pre className="settings-mcp-config">{mcpConfig}</pre>
          <p className="setup-step__hint">
            Details: <code>frontend/docs/overlay-css-mcp.md</code>
          </p>
          <label htmlFor="overlay-custom-css">CSS</label>
          <textarea
            id="overlay-custom-css"
            className="settings-css-editor"
            rows={12}
            spellCheck={false}
            placeholder={'.overlay-card {\n  font-size: 1.25rem;\n}'}
            value={form.overlayCustomCss}
            onChange={(e) => {
              setSaved(false);
              setForm({ ...form, overlayCustomCss: e.target.value });
            }}
          />
        </section>

        <div className="form-actions">
          <button type="submit" disabled={saving || multiplierInvalid}>
            <FaSave aria-hidden />
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        </div>

        {error ? <p className="setup-step__error">{error.message}</p> : null}
        {saved ? <p className="setup-step__success">Settings saved.</p> : null}
      </form>
    </div>
  );
}

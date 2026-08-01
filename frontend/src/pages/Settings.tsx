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
};

/** MCP runs on the Nest API, not the Vite UI port. */
function getMcpServerUrl(): string {
  if (typeof window === 'undefined') {
    return 'http://127.0.0.1:4000/mcp';
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
        const s = res.updateAppSettings;
        setForm({
          showQuestionChat: s.showQuestionChat,
          questionChatTemplate: s.questionChatTemplate,
          showCutoffChat: s.showCutoffChat,
          cutoffChatMessage: s.cutoffChatMessage,
          scoreMultiplier: s.scoreMultiplier,
          overlayCustomCss: s.overlayCustomCss ?? '',
        });
        setSaved(true);
      },
    }
  );

  useEffect(() => {
    const s = data?.appSettings;
    if (!s) return;
    setForm({
      showQuestionChat: s.showQuestionChat,
      questionChatTemplate: s.questionChatTemplate,
      showCutoffChat: s.showCutoffChat,
      cutoffChatMessage: s.cutoffChatMessage,
      scoreMultiplier: s.scoreMultiplier,
      overlayCustomCss: s.overlayCustomCss ?? '',
    });
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
        Configure Twitch chat announcements, score display, and overlay styling.
      </p>

      <form className="form-grid" onSubmit={handleSubmit}>
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
            Optional: edit via your own chatbot — with the app running, add this Cursor MCP server:
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

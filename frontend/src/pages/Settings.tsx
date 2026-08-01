import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
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
};

export default function Settings() {
  const { data, loading } = useQuery<GetAppSettingsData>(GET_APP_SETTINGS);
  const [form, setForm] = useState<AppSettingsFormState>(emptyForm);
  const [saved, setSaved] = useState(false);

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
        Configure Twitch chat announcements and how scores are displayed on overlays.
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
            Post question message to Twitch chat when a round starts
          </label>
          <label htmlFor="question-chat-template">Message template</label>
          <textarea
            id="question-chat-template"
            rows={6}
            value={form.questionChatTemplate}
            disabled={!form.showQuestionChat}
            onChange={(e) => setForm({ ...form, questionChatTemplate: e.target.value })}
            required={form.showQuestionChat}
          />
          <p className="setup-step__hint">
            Placeholders:{' '}
            <code>{'{{round}}'}</code> <code>{'{{question}}'}</code>{' '}
            <code>{'{{answerA}}'}</code> <code>{'{{answerB}}'}</code>{' '}
            <code>{'{{answerC}}'}</code> <code>{'{{answerD}}'}</code>{' '}
            <code>{'{{countDownSecond}}'}</code>
          </p>
        </section>

        <section className="settings-section">
          <h3>Chat cutoff message</h3>
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={form.showCutoffChat}
              onChange={(e) => setForm({ ...form, showCutoffChat: e.target.checked })}
            />
            Post cutoff message when countdown ends
          </label>
          <label htmlFor="cutoff-chat-message">Cutoff message</label>
          <textarea
            id="cutoff-chat-message"
            rows={2}
            value={form.cutoffChatMessage}
            disabled={!form.showCutoffChat}
            onChange={(e) => setForm({ ...form, cutoffChatMessage: e.target.value })}
            required={form.showCutoffChat}
          />
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

        <div className="form-actions">
          <button type="submit" disabled={saving || multiplierInvalid}>
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        </div>

        {error ? <p className="setup-step__error">{error.message}</p> : null}
        {saved ? <p className="setup-step__success">Settings saved.</p> : null}
      </form>
    </div>
  );
}

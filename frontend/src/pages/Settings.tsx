import { memo, useMemo, useState } from 'react';
import { Form, Formik } from 'formik';
import { useMutation, useQuery } from '@apollo/client/react';
import { FaSave } from 'react-icons/fa';
import { FormCheckbox, FormTextArea, FormTextInput } from '../components/form';
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

function isMultiplierInvalid(value: number | string): boolean {
  return value === '' || !Number.isInteger(Number(value)) || Number(value) <= 0;
}

const SettingsFormFields = memo(function SettingsFormFields({
  showQuestionChat,
  showCutoffChat,
  multiplierInvalid,
  mcpConfig,
  saving,
  saved,
  errorMessage,
  onEdited,
}: {
  showQuestionChat: boolean;
  showCutoffChat: boolean;
  multiplierInvalid: boolean;
  mcpConfig: string;
  saving: boolean;
  saved: boolean;
  errorMessage: string | null;
  onEdited: () => void;
}) {
  return (
    <>
      <section className="settings-section">
        <h3>Overlay labels</h3>
        <p className="setup-step__hint">
          Text shown on the live round preview and OBS trivia overlay.
        </p>
        <FormTextInput
          name="roundLabelTemplate"
          id="round-label-template"
          label="Active round label"
          required
          onEdited={onEdited}
          hint={
            <p className="setup-step__hint">
              Use <code>{'{{round}}'}</code> for the round id. Default: <code>第{'{{round}}'}題</code>
            </p>
          }
        />
        <FormTextInput
          name="roundLabelIdle"
          id="round-label-idle"
          label="Idle / placeholder label"
          required
          onEdited={onEdited}
          hint={
            <p className="setup-step__hint">
              Shown when no round is active. Default: <code>第0題</code>
            </p>
          }
        />
        <FormTextInput
          name="idleQuestionText"
          id="idle-question-text"
          label="Idle question text"
          required
          onEdited={onEdited}
          hint={
            <p className="setup-step__hint">
              Placeholder question body when idle. Default: <code>即將開始</code>
            </p>
          }
        />
        <FormTextInput
          name="countdownLabel"
          id="countdown-label"
          label="Countdown label"
          required
          onEdited={onEdited}
        />
        <FormTextInput
          name="countdownPausedLabel"
          id="countdown-paused-label"
          label="Paused countdown label"
          required
          onEdited={onEdited}
        />
        <FormTextInput
          name="countdownValueTemplate"
          id="countdown-value-template"
          label="Countdown value"
          required
          onEdited={onEdited}
          hint={
            <p className="setup-step__hint">
              Use <code>{'{{seconds}}'}</code> for remaining time. Default:{' '}
              <code>{'{{seconds}}s'}</code>
            </p>
          }
        />
      </section>

      <section className="settings-section">
        <h3>Chat question message</h3>
        <FormCheckbox name="showQuestionChat" label="Enable" onEdited={onEdited} />
        {showQuestionChat ? (
          <FormTextArea
            name="questionChatTemplate"
            id="question-chat-template"
            label="Message template"
            rows={6}
            required
            onEdited={onEdited}
            hint={
              <>
                <p className="setup-step__hint">
                  Placeholders: <code>{'{{round}}'}</code> <code>{'{{question}}'}</code>{' '}
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
            }
          />
        ) : null}
      </section>

      <section className="settings-section">
        <h3>Chat cutoff message</h3>
        <FormCheckbox name="showCutoffChat" label="Enable" onEdited={onEdited} />
        {showCutoffChat ? (
          <FormTextArea
            name="cutoffChatMessage"
            id="cutoff-chat-message"
            label="Message template"
            rows={2}
            required
            onEdited={onEdited}
          />
        ) : null}
      </section>

      <section className="settings-section">
        <h3>Score multiplier</h3>
        <p className="setup-step__hint">
          Displayed score = stored points × multiplier. Default is 10. Must be a positive integer.
        </p>
        <FormTextInput
          name="scoreMultiplier"
          id="score-multiplier"
          label="Multiplier"
          type="number"
          min={1}
          step={1}
          required
          onEdited={onEdited}
        />
        {multiplierInvalid ? (
          <p className="setup-step__error">
            Score multiplier must be a positive integer (not 0 or negative).
          </p>
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
        <FormTextArea
          name="overlayCustomCss"
          id="overlay-custom-css"
          label="CSS"
          className="settings-css-editor"
          rows={12}
          spellCheck={false}
          placeholder={'.overlay-card {\n  font-size: 1.25rem;\n}'}
          onEdited={onEdited}
        />
      </section>

      <div className="form-actions">
        <button type="submit" disabled={saving || multiplierInvalid}>
          <FaSave aria-hidden />
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </div>

      {errorMessage ? <p className="setup-step__error">{errorMessage}</p> : null}
      {saved ? <p className="setup-step__success">Settings saved.</p> : null}
    </>
  );
});

function Settings() {
  const { data, loading } = useQuery<GetAppSettingsData>(GET_APP_SETTINGS);
  const [saved, setSaved] = useState(false);
  const mcpUrl = getMcpServerUrl();
  const mcpConfig = useMemo(() => mcpConfigSnippet(mcpUrl), [mcpUrl]);

  const initialValues = useMemo(
    () => (data?.appSettings ? settingsToForm(data.appSettings) : emptyForm),
    [data]
  );

  const [updateSettings, { loading: saving, error }] = useMutation<UpdateAppSettingsMutation>(
    UPDATE_APP_SETTINGS,
    {
      onCompleted: () => setSaved(true),
    }
  );

  if (loading && !data) {
    return <p style={{ color: 'var(--muted)' }}>Loading settings…</p>;
  }

  return (
    <div className="card settings-page">
      <h2>Settings</h2>
      <p className="setup-step__hint">
        Configure Twitch chat announcements, score display, overlay labels, and overlay styling.
      </p>

      <Formik<AppSettingsFormState>
        initialValues={initialValues}
        enableReinitialize
        onSubmit={(values) => {
          setSaved(false);
          const multiplier = Number(values.scoreMultiplier);
          if (!Number.isInteger(multiplier) || multiplier <= 0) return;
          void updateSettings({
            variables: {
              input: {
                showQuestionChat: values.showQuestionChat,
                questionChatTemplate: values.questionChatTemplate,
                showCutoffChat: values.showCutoffChat,
                cutoffChatMessage: values.cutoffChatMessage,
                scoreMultiplier: multiplier,
                overlayCustomCss: values.overlayCustomCss,
                roundLabelTemplate: values.roundLabelTemplate,
                roundLabelIdle: values.roundLabelIdle,
                idleQuestionText: values.idleQuestionText,
                countdownLabel: values.countdownLabel,
                countdownPausedLabel: values.countdownPausedLabel,
                countdownValueTemplate: values.countdownValueTemplate,
              },
            },
          });
        }}
      >
        {({ values }) => (
          <Form className="form-grid">
            <SettingsFormFields
              showQuestionChat={values.showQuestionChat}
              showCutoffChat={values.showCutoffChat}
              multiplierInvalid={isMultiplierInvalid(values.scoreMultiplier)}
              mcpConfig={mcpConfig}
              saving={saving}
              saved={saved}
              errorMessage={error?.message ?? null}
              onEdited={() => setSaved(false)}
            />
          </Form>
        )}
      </Formik>
    </div>
  );
}

export default memo(Settings);

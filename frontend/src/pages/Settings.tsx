import { memo, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
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

const SETTINGS_HINT_VALUES = {
  roundToken: '{{round}}',
  roundDefault: '第{{round}}題',
  idleDefault: '第0題',
  idleQuestionDefault: '即將開始',
  secondsToken: '{{seconds}}',
  secondsDefault: '{{seconds}}s',
  pRound: '{{round}}',
  pQuestion: '{{question}}',
  pA: '{{answerA}}',
  pB: '{{answerB}}',
  pC: '{{answerC}}',
  pD: '{{answerD}}',
  pCountdown: '{{countDownSecond}}',
  chatDefault:
    'Q{{round}}:  {{question}} A ) {{answerA}} B ) {{answerB}} C ) {{answerC}} D ) {{answerD}}',
};

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
  const { t } = useTranslation();
  return (
    <>
      <section className="settings-section">
        <h3>{t('settings.overlayLabels')}</h3>
        <p className="setup-step__hint">{t('settings.overlayLabelsHint')}</p>
        <FormTextInput
          name="roundLabelTemplate"
          id="round-label-template"
          label={t('settings.roundLabelTemplate')}
          required
          onEdited={onEdited}
          hint={
            <p className="setup-step__hint">
              <Trans
                i18nKey="settings.roundLabelTemplateHint"
                values={SETTINGS_HINT_VALUES}
                components={{ code: <code /> }}
              />
            </p>
          }
        />
        <FormTextInput
          name="roundLabelIdle"
          id="round-label-idle"
          label={t('settings.roundLabelIdle')}
          required
          onEdited={onEdited}
          hint={
            <p className="setup-step__hint">
              <Trans
                i18nKey="settings.roundLabelIdleHint"
                values={SETTINGS_HINT_VALUES}
                components={{ code: <code /> }}
              />
            </p>
          }
        />
        <FormTextInput
          name="idleQuestionText"
          id="idle-question-text"
          label={t('settings.idleQuestionText')}
          required
          onEdited={onEdited}
          hint={
            <p className="setup-step__hint">
              <Trans
                i18nKey="settings.idleQuestionTextHint"
                values={SETTINGS_HINT_VALUES}
                components={{ code: <code /> }}
              />
            </p>
          }
        />
        <FormTextInput
          name="countdownLabel"
          id="countdown-label"
          label={t('settings.countdownLabel')}
          required
          onEdited={onEdited}
        />
        <FormTextInput
          name="countdownPausedLabel"
          id="countdown-paused-label"
          label={t('settings.countdownPausedLabel')}
          required
          onEdited={onEdited}
        />
        <FormTextInput
          name="countdownValueTemplate"
          id="countdown-value-template"
          label={t('settings.countdownValue')}
          required
          onEdited={onEdited}
          hint={
            <p className="setup-step__hint">
              <Trans
                i18nKey="settings.countdownValueHint"
                values={SETTINGS_HINT_VALUES}
                components={{ code: <code /> }}
              />
            </p>
          }
        />
      </section>

      <section className="settings-section">
        <h3>{t('settings.chatQuestion')}</h3>
        <FormCheckbox name="showQuestionChat" label={t('common.enable')} onEdited={onEdited} />
        {showQuestionChat ? (
          <FormTextArea
            name="questionChatTemplate"
            id="question-chat-template"
            label={t('settings.messageTemplate')}
            rows={6}
            required
            onEdited={onEdited}
            hint={
              <>
                <p className="setup-step__hint">
                  <Trans
                    i18nKey="settings.chatQuestionPlaceholders"
                    values={SETTINGS_HINT_VALUES}
                    components={{ code: <code /> }}
                  />
                </p>
                <p className="setup-step__hint">
                  <Trans
                    i18nKey="settings.chatQuestionDefault"
                    values={SETTINGS_HINT_VALUES}
                    components={{ code: <code /> }}
                  />
                </p>
              </>
            }
          />
        ) : null}
      </section>

      <section className="settings-section">
        <h3>{t('settings.chatCutoff')}</h3>
        <FormCheckbox name="showCutoffChat" label={t('common.enable')} onEdited={onEdited} />
        {showCutoffChat ? (
          <FormTextArea
            name="cutoffChatMessage"
            id="cutoff-chat-message"
            label={t('settings.messageTemplate')}
            rows={2}
            required
            onEdited={onEdited}
          />
        ) : null}
      </section>

      <section className="settings-section">
        <h3>{t('settings.scoreMultiplier')}</h3>
        <p className="setup-step__hint">{t('settings.scoreMultiplierHint')}</p>
        <FormTextInput
          name="scoreMultiplier"
          id="score-multiplier"
          label={t('settings.multiplier')}
          type="number"
          min={1}
          step={1}
          required
          onEdited={onEdited}
        />
        {multiplierInvalid ? (
          <p className="setup-step__error">{t('settings.multiplierInvalid')}</p>
        ) : null}
      </section>

      <section className="settings-section">
        <h3>{t('settings.overlayCss')}</h3>
        <p className="setup-step__hint">
          <Trans i18nKey="settings.overlayCssHint" components={{ code: <code /> }} />
        </p>
        <p className="setup-step__hint">{t('settings.mcpHint')}</p>
        <pre className="settings-mcp-config">{mcpConfig}</pre>
        <FormTextArea
          name="overlayCustomCss"
          id="overlay-custom-css"
          label={t('settings.css')}
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
          {saving ? t('common.saving') : t('settings.save')}
        </button>
      </div>

      {errorMessage ? <p className="setup-step__error">{errorMessage}</p> : null}
      {saved ? <p className="setup-step__success">{t('settings.saved')}</p> : null}
    </>
  );
});

function Settings() {
  const { t } = useTranslation();
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
    return <p style={{ color: 'var(--muted)' }}>{t('settings.loading')}</p>;
  }

  return (
    <div className="card settings-page">
      <h2>{t('settings.title')}</h2>
      <p className="setup-step__hint">{t('settings.intro')}</p>

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

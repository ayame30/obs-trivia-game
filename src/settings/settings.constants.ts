export const DEFAULT_QUESTION_CHAT_TEMPLATE =
  'Q{{round}}:  {{question}} A ) {{answerA}} B ) {{answerB}} C ) {{answerC}} D ) {{answerD}}';

export const DEFAULT_CUTOFF_CHAT_MESSAGE = '===== END =====';
export const DEFAULT_SCORE_MULTIPLIER = 10;
export const DEFAULT_ROUND_LABEL_TEMPLATE = '第{{round}}題';
export const DEFAULT_ROUND_LABEL_IDLE = '第0題';
export const DEFAULT_IDLE_QUESTION_TEXT = '即將開始';
export const DEFAULT_COUNTDOWN_LABEL = '倒數時間';
export const DEFAULT_COUNTDOWN_PAUSED_LABEL = '暫停倒數';
export const DEFAULT_COUNTDOWN_VALUE_TEMPLATE = '{{seconds}}s';

/** Older multiline chat template — rewritten to the single-line default on boot. */
export const LEGACY_QUESTION_CHAT_TEMPLATE = [
  'Q{{round}}: {{question}}',
  'A ) {{answerA}}',
  'B ) {{answerB}}',
  'C ) {{answerC}}',
  'D ) {{answerD}}',
].join('\n');

export const SETTINGS_KEYS = {
  showQuestionChat: 'show_question_chat',
  questionChatTemplate: 'question_chat_template',
  showCutoffChat: 'show_cutoff_chat',
  cutoffChatMessage: 'cutoff_chat_message',
  scoreMultiplier: 'score_multiplier',
  overlayCustomCss: 'overlay_custom_css',
  roundLabelTemplate: 'round_label_template',
  roundLabelIdle: 'round_label_idle',
  idleQuestionText: 'idle_question_text',
  countdownLabel: 'countdown_label',
  countdownPausedLabel: 'countdown_paused_label',
  countdownValueTemplate: 'countdown_value_template',
} as const;

export type SettingKey = (typeof SETTINGS_KEYS)[keyof typeof SETTINGS_KEYS];

export const SETTINGS_DEFAULTS: Record<SettingKey, string> = {
  [SETTINGS_KEYS.showQuestionChat]: 'true',
  [SETTINGS_KEYS.questionChatTemplate]: DEFAULT_QUESTION_CHAT_TEMPLATE,
  [SETTINGS_KEYS.showCutoffChat]: 'true',
  [SETTINGS_KEYS.cutoffChatMessage]: DEFAULT_CUTOFF_CHAT_MESSAGE,
  [SETTINGS_KEYS.scoreMultiplier]: String(DEFAULT_SCORE_MULTIPLIER),
  [SETTINGS_KEYS.overlayCustomCss]: '',
  [SETTINGS_KEYS.roundLabelTemplate]: DEFAULT_ROUND_LABEL_TEMPLATE,
  [SETTINGS_KEYS.roundLabelIdle]: DEFAULT_ROUND_LABEL_IDLE,
  [SETTINGS_KEYS.idleQuestionText]: DEFAULT_IDLE_QUESTION_TEXT,
  [SETTINGS_KEYS.countdownLabel]: DEFAULT_COUNTDOWN_LABEL,
  [SETTINGS_KEYS.countdownPausedLabel]: DEFAULT_COUNTDOWN_PAUSED_LABEL,
  [SETTINGS_KEYS.countdownValueTemplate]: DEFAULT_COUNTDOWN_VALUE_TEMPLATE,
};

export const REQUIRED_STRING_FIELDS = [
  {
    inputKey: 'questionChatTemplate' as const,
    settingKey: SETTINGS_KEYS.questionChatTemplate,
    label: 'Question chat template',
  },
  {
    inputKey: 'cutoffChatMessage' as const,
    settingKey: SETTINGS_KEYS.cutoffChatMessage,
    label: 'Cutoff chat message',
  },
  {
    inputKey: 'roundLabelTemplate' as const,
    settingKey: SETTINGS_KEYS.roundLabelTemplate,
    label: 'Round label template',
  },
  {
    inputKey: 'roundLabelIdle' as const,
    settingKey: SETTINGS_KEYS.roundLabelIdle,
    label: 'Idle round label',
  },
  {
    inputKey: 'idleQuestionText' as const,
    settingKey: SETTINGS_KEYS.idleQuestionText,
    label: 'Idle question text',
  },
  {
    inputKey: 'countdownLabel' as const,
    settingKey: SETTINGS_KEYS.countdownLabel,
    label: 'Countdown label',
  },
  {
    inputKey: 'countdownPausedLabel' as const,
    settingKey: SETTINGS_KEYS.countdownPausedLabel,
    label: 'Paused countdown label',
  },
  {
    inputKey: 'countdownValueTemplate' as const,
    settingKey: SETTINGS_KEYS.countdownValueTemplate,
    label: 'Countdown value template',
  },
];

export const BOOLEAN_FIELDS = [
  {
    inputKey: 'showQuestionChat' as const,
    settingKey: SETTINGS_KEYS.showQuestionChat,
  },
  {
    inputKey: 'showCutoffChat' as const,
    settingKey: SETTINGS_KEYS.showCutoffChat,
  },
];

export const WIDE_TABLE_MIGRATION_FIELDS = [
  {
    column: 'show_question_chat',
    settingKey: SETTINGS_KEYS.showQuestionChat,
    kind: 'bool' as const,
  },
  {
    column: 'question_chat_template',
    settingKey: SETTINGS_KEYS.questionChatTemplate,
    kind: 'string' as const,
    fallback: DEFAULT_QUESTION_CHAT_TEMPLATE,
  },
  {
    column: 'show_cutoff_chat',
    settingKey: SETTINGS_KEYS.showCutoffChat,
    kind: 'bool' as const,
  },
  {
    column: 'cutoff_chat_message',
    settingKey: SETTINGS_KEYS.cutoffChatMessage,
    kind: 'string' as const,
    fallback: DEFAULT_CUTOFF_CHAT_MESSAGE,
  },
  {
    column: 'score_multiplier',
    settingKey: SETTINGS_KEYS.scoreMultiplier,
    kind: 'string' as const,
    fallback: String(DEFAULT_SCORE_MULTIPLIER),
  },
];

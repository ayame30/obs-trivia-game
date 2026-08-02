import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

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

@Entity('app_settings')
export class AppSettings {
  @PrimaryColumn({ type: 'text' })
  key!: string;

  @Column({ type: 'text' })
  value!: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'text' })
  updatedAt!: Date;
}

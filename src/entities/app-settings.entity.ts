import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export const DEFAULT_QUESTION_CHAT_TEMPLATE =
  'Q{{round}}:  {{question}} A ) {{answerA}} B ) {{answerB}} C ) {{answerC}} D ) {{answerD}}';

export const DEFAULT_CUTOFF_CHAT_MESSAGE = '===== END =====';
export const DEFAULT_SCORE_MULTIPLIER = 10;

export const SETTINGS_KEYS = {
  showQuestionChat: 'show_question_chat',
  questionChatTemplate: 'question_chat_template',
  showCutoffChat: 'show_cutoff_chat',
  cutoffChatMessage: 'cutoff_chat_message',
  scoreMultiplier: 'score_multiplier',
} as const;

export type SettingKey = (typeof SETTINGS_KEYS)[keyof typeof SETTINGS_KEYS];

export const SETTINGS_DEFAULTS: Record<SettingKey, string> = {
  [SETTINGS_KEYS.showQuestionChat]: 'true',
  [SETTINGS_KEYS.questionChatTemplate]: DEFAULT_QUESTION_CHAT_TEMPLATE,
  [SETTINGS_KEYS.showCutoffChat]: 'true',
  [SETTINGS_KEYS.cutoffChatMessage]: DEFAULT_CUTOFF_CHAT_MESSAGE,
  [SETTINGS_KEYS.scoreMultiplier]: String(DEFAULT_SCORE_MULTIPLIER),
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

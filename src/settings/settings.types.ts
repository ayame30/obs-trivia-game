import { SETTINGS_KEYS, type SettingKey } from '../entities/app-settings.entity';

export interface AppSettingsValues {
  showQuestionChat: boolean;
  questionChatTemplate: string;
  showCutoffChat: boolean;
  cutoffChatMessage: string;
  scoreMultiplier: number;
  overlayCustomCss: string;
  roundLabelTemplate: string;
  roundLabelIdle: string;
  idleQuestionText: string;
  countdownLabel: string;
  countdownPausedLabel: string;
  countdownValueTemplate: string;
  updatedAt: string;
}

export type UpdateAppSettingsInput = Partial<{
  showQuestionChat: boolean;
  questionChatTemplate: string;
  showCutoffChat: boolean;
  cutoffChatMessage: string;
  scoreMultiplier: number;
  overlayCustomCss: string;
  roundLabelTemplate: string;
  roundLabelIdle: string;
  idleQuestionText: string;
  countdownLabel: string;
  countdownPausedLabel: string;
  countdownValueTemplate: string;
}>;

export type RequiredStringFieldKey =
  | 'questionChatTemplate'
  | 'cutoffChatMessage'
  | 'roundLabelTemplate'
  | 'roundLabelIdle'
  | 'idleQuestionText'
  | 'countdownLabel'
  | 'countdownPausedLabel'
  | 'countdownValueTemplate';

export type BooleanFieldKey = 'showQuestionChat' | 'showCutoffChat';

export type RequiredStringField = {
  inputKey: RequiredStringFieldKey;
  settingKey: SettingKey;
  label: string;
};

export type BooleanField = {
  inputKey: BooleanFieldKey;
  settingKey: SettingKey;
};

export const REQUIRED_STRING_FIELDS: RequiredStringField[] = [
  {
    inputKey: 'questionChatTemplate',
    settingKey: SETTINGS_KEYS.questionChatTemplate,
    label: 'Question chat template',
  },
  {
    inputKey: 'cutoffChatMessage',
    settingKey: SETTINGS_KEYS.cutoffChatMessage,
    label: 'Cutoff chat message',
  },
  {
    inputKey: 'roundLabelTemplate',
    settingKey: SETTINGS_KEYS.roundLabelTemplate,
    label: 'Round label template',
  },
  {
    inputKey: 'roundLabelIdle',
    settingKey: SETTINGS_KEYS.roundLabelIdle,
    label: 'Idle round label',
  },
  {
    inputKey: 'idleQuestionText',
    settingKey: SETTINGS_KEYS.idleQuestionText,
    label: 'Idle question text',
  },
  {
    inputKey: 'countdownLabel',
    settingKey: SETTINGS_KEYS.countdownLabel,
    label: 'Countdown label',
  },
  {
    inputKey: 'countdownPausedLabel',
    settingKey: SETTINGS_KEYS.countdownPausedLabel,
    label: 'Paused countdown label',
  },
  {
    inputKey: 'countdownValueTemplate',
    settingKey: SETTINGS_KEYS.countdownValueTemplate,
    label: 'Countdown value template',
  },
];

export const BOOLEAN_FIELDS: BooleanField[] = [
  { inputKey: 'showQuestionChat', settingKey: SETTINGS_KEYS.showQuestionChat },
  { inputKey: 'showCutoffChat', settingKey: SETTINGS_KEYS.showCutoffChat },
];

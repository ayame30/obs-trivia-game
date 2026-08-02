import type { SettingKey } from './settings.constants';

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
  uiLocale: string;
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
  uiLocale: string;
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

export type WideMigrationField =
  | {
      column: string;
      settingKey: SettingKey;
      kind: 'bool';
    }
  | {
      column: string;
      settingKey: SettingKey;
      kind: 'string';
      fallback: string;
    };

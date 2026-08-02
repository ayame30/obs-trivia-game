import { useQuery } from '@apollo/client/react';
import { GET_APP_SETTINGS } from '../graphql/operations';
import type { AppSettings, GetAppSettingsData } from '../types';

export const DEFAULT_SCORE_MULTIPLIER = 10;
export const DEFAULT_ROUND_LABEL_TEMPLATE = 'Q{{round}}';
export const DEFAULT_ROUND_LABEL_IDLE = 'Q0';
export const DEFAULT_IDLE_QUESTION_TEXT = 'Waiting for next question...';
export const DEFAULT_COUNTDOWN_LABEL = 'Countdown';
export const DEFAULT_COUNTDOWN_PAUSED_LABEL = 'Paused';
export const DEFAULT_COUNTDOWN_VALUE_TEMPLATE = '{{seconds}}s';
export const DEFAULT_UI_LOCALE = 'en';

export function formatRoundLabel(template: string, roundId: string | number): string {
  return template.replace(/\{\{round\}\}/g, String(roundId));
}

export function formatCountdownValue(template: string, seconds: number): string {
  return template.replace(/\{\{seconds\}\}/g, String(seconds));
}

export function useAppSettings() {
  const { data, loading, error, refetch } = useQuery<GetAppSettingsData>(GET_APP_SETTINGS);
  const settings: AppSettings | null = data?.appSettings ?? null;
  const scoreMultiplier =
    settings?.scoreMultiplier && settings.scoreMultiplier > 0
      ? settings.scoreMultiplier
      : DEFAULT_SCORE_MULTIPLIER;

  const roundLabelTemplate = settings?.roundLabelTemplate || DEFAULT_ROUND_LABEL_TEMPLATE;
  const roundLabelIdle = settings?.roundLabelIdle || DEFAULT_ROUND_LABEL_IDLE;
  const idleQuestionText = settings?.idleQuestionText || DEFAULT_IDLE_QUESTION_TEXT;
  const countdownLabel = settings?.countdownLabel || DEFAULT_COUNTDOWN_LABEL;
  const countdownPausedLabel =
    settings?.countdownPausedLabel || DEFAULT_COUNTDOWN_PAUSED_LABEL;
  const countdownValueTemplate =
    settings?.countdownValueTemplate || DEFAULT_COUNTDOWN_VALUE_TEMPLATE;
  const uiLocale = settings?.uiLocale || DEFAULT_UI_LOCALE;

  return {
    settings,
    scoreMultiplier,
    roundLabelTemplate,
    roundLabelIdle,
    idleQuestionText,
    countdownLabel,
    countdownPausedLabel,
    countdownValueTemplate,
    uiLocale,
    loading,
    error: error?.message ?? null,
    refetch,
  };
}

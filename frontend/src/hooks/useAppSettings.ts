import { useQuery } from '@apollo/client/react';
import { GET_APP_SETTINGS } from '../graphql/operations';
import type { AppSettings, GetAppSettingsData } from '../types';

export const DEFAULT_SCORE_MULTIPLIER = 10;
export const DEFAULT_ROUND_LABEL_TEMPLATE = '第{{round}}題';
export const DEFAULT_ROUND_LABEL_IDLE = '第0題';
export const DEFAULT_IDLE_QUESTION_TEXT = '即將開始';
export const DEFAULT_COUNTDOWN_LABEL = '倒數時間';
export const DEFAULT_COUNTDOWN_PAUSED_LABEL = '暫停倒數';
export const DEFAULT_COUNTDOWN_VALUE_TEMPLATE = '{{seconds}}s';

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

  return {
    settings,
    scoreMultiplier,
    roundLabelTemplate,
    roundLabelIdle,
    idleQuestionText,
    countdownLabel,
    countdownPausedLabel,
    countdownValueTemplate,
    loading,
    error: error?.message ?? null,
    refetch,
  };
}

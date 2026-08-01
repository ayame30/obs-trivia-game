import { useQuery } from '@apollo/client/react';
import { GET_APP_SETTINGS } from '../graphql/operations';
import type { AppSettings, GetAppSettingsData } from '../types';

export const DEFAULT_SCORE_MULTIPLIER = 10;

export function useAppSettings() {
  const { data, loading, error, refetch } = useQuery<GetAppSettingsData>(GET_APP_SETTINGS);
  const settings: AppSettings | null = data?.appSettings ?? null;
  const scoreMultiplier =
    settings?.scoreMultiplier && settings.scoreMultiplier > 0
      ? settings.scoreMultiplier
      : DEFAULT_SCORE_MULTIPLIER;

  return {
    settings,
    scoreMultiplier,
    loading,
    error: error?.message ?? null,
    refetch,
  };
}

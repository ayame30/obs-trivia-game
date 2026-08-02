import {
  BOOLEAN_FIELDS,
  DEFAULT_SCORE_MULTIPLIER,
  DEFAULT_UI_LOCALE,
  REQUIRED_STRING_FIELDS,
  SETTINGS_DEFAULTS,
  SETTINGS_KEYS,
  SUPPORTED_UI_LOCALES,
  type SettingKey,
  type UiLocale,
} from './settings.constants';
import type { AppSettingsValues, WideMigrationField } from './settings.types';

export function parseScoreMultiplier(raw: string): number {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : DEFAULT_SCORE_MULTIPLIER;
}

export function assertPositiveInteger(value: unknown, label: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
  return n;
}

export function parseUiLocale(raw: string): UiLocale {
  return (SUPPORTED_UI_LOCALES as readonly string[]).includes(raw)
    ? (raw as UiLocale)
    : DEFAULT_UI_LOCALE;
}

export function assertUiLocale(value: unknown): UiLocale {
  const locale = String(value ?? '').trim();
  if (!(SUPPORTED_UI_LOCALES as readonly string[]).includes(locale)) {
    throw new Error(`UI locale must be one of: ${SUPPORTED_UI_LOCALES.join(', ')}`);
  }
  return locale as UiLocale;
}

export function latestUpdatedAt(rows: Array<{ updatedAt?: Date | string | null }>): string {
  let latest: string | null = null;
  for (const row of rows) {
    const at = String(row.updatedAt ?? '');
    if (!latest || at > latest) latest = at;
  }
  return latest || new Date().toISOString();
}

export function asBoolString(value: unknown): string {
  return value === 0 || value === false || value === '0' ? 'false' : 'true';
}

export function isKeyValueSettingsSchema(columns: Set<string>): boolean {
  return columns.has('key') && columns.has('value') && !columns.has('show_question_chat');
}

export function isLegacyWideSettingsSchema(columns: Set<string>): boolean {
  return columns.has('show_question_chat');
}

export function migrateWideFieldValue(field: WideMigrationField, raw: unknown): string {
  if (field.kind === 'bool') return asBoolString(raw);
  return String(raw ?? field.fallback);
}

export function buildAppSettingsValues(
  get: (key: SettingKey) => string,
  updatedAt: string
): AppSettingsValues {
  const booleans = Object.fromEntries(
    BOOLEAN_FIELDS.map((field) => [field.inputKey, get(field.settingKey) !== 'false'])
  ) as Pick<AppSettingsValues, (typeof BOOLEAN_FIELDS)[number]['inputKey']>;

  const strings = Object.fromEntries(
    REQUIRED_STRING_FIELDS.map((field) => [
      field.inputKey,
      get(field.settingKey) || SETTINGS_DEFAULTS[field.settingKey],
    ])
  ) as Pick<AppSettingsValues, (typeof REQUIRED_STRING_FIELDS)[number]['inputKey']>;

  return {
    ...booleans,
    ...strings,
    scoreMultiplier: parseScoreMultiplier(get(SETTINGS_KEYS.scoreMultiplier)),
    overlayCustomCss: get(SETTINGS_KEYS.overlayCustomCss) ?? '',
    uiLocale: parseUiLocale(get(SETTINGS_KEYS.uiLocale)),
    updatedAt,
  };
}

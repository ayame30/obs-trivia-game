export const SUPPORTED_UI_LOCALES = ['en', 'zh-TW', 'zh-CN', 'ja'] as const;
export type UiLocale = (typeof SUPPORTED_UI_LOCALES)[number];

export const DEFAULT_UI_LOCALE: UiLocale = 'en';

export const UI_LOCALE_LABELS: Record<UiLocale, string> = {
  en: 'English',
  'zh-TW': '繁體中文',
  'zh-CN': '簡體中文',
  ja: '日本語',
};

export function isUiLocale(value: string): value is UiLocale {
  return (SUPPORTED_UI_LOCALES as readonly string[]).includes(value);
}

export function normalizeUiLocale(value: string | null | undefined): UiLocale {
  return value && isUiLocale(value) ? value : DEFAULT_UI_LOCALE;
}

import { useEffect, useRef } from 'react';
import { useMutation } from '@apollo/client/react';
import { useTranslation } from 'react-i18next';
import { GET_APP_SETTINGS, UPDATE_APP_SETTINGS } from '../graphql/operations';
import { useAppSettings } from '../hooks/useAppSettings';
import {
  DEFAULT_UI_LOCALE,
  UI_LOCALE_LABELS,
  SUPPORTED_UI_LOCALES,
  normalizeUiLocale,
  type UiLocale,
} from '../i18n/locales';
import type { UpdateAppSettingsMutation } from '../types';

export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const { settings } = useAppSettings();
  const [updateSettings] = useMutation<UpdateAppSettingsMutation>(UPDATE_APP_SETTINGS, {
    refetchQueries: [{ query: GET_APP_SETTINGS }],
  });
  const savingRef = useRef(false);

  const persisted = normalizeUiLocale(settings?.uiLocale);
  const current = normalizeUiLocale(i18n.language);

  useEffect(() => {
    if (!settings || savingRef.current) return;
    if (persisted !== i18n.language) {
      void i18n.changeLanguage(persisted);
    }
  }, [settings, persisted, i18n]);

  async function handleChange(next: string) {
    const locale = normalizeUiLocale(next);
    if (locale === current) return;
    savingRef.current = true;
    await i18n.changeLanguage(locale);
    try {
      await updateSettings({ variables: { input: { uiLocale: locale } } });
    } catch {
      const fallback = settings?.uiLocale ? normalizeUiLocale(settings.uiLocale) : DEFAULT_UI_LOCALE;
      void i18n.changeLanguage(fallback);
    } finally {
      savingRef.current = false;
    }
  }

  return (
    <label className="language-switcher">
      <span className="visually-hidden">{t('layout.language')}</span>
      <select
        className="language-switcher__select"
        value={current}
        aria-label={t('layout.language')}
        onChange={(e) => {
          void handleChange(e.target.value);
        }}
      >
        {SUPPORTED_UI_LOCALES.map((code: UiLocale) => (
          <option key={code} value={code}>
            {UI_LOCALE_LABELS[code]}
          </option>
        ))}
      </select>
    </label>
  );
}

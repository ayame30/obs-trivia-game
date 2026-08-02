import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { DEFAULT_UI_LOCALE } from './locales';
import en from './locales/en.json';
import zhTW from './locales/zh-TW.json';
import zhCN from './locales/zh-CN.json';
import ja from './locales/ja.json';

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    'zh-TW': { translation: zhTW },
    'zh-CN': { translation: zhCN },
    ja: { translation: ja },
  },
  lng: DEFAULT_UI_LOCALE,
  fallbackLng: DEFAULT_UI_LOCALE,
  supportedLngs: ['en', 'zh-TW', 'zh-CN', 'ja'],
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;

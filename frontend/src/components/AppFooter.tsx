import { useTranslation } from 'react-i18next';

const GITHUB_ISSUES_URL = 'https://github.com/ayame30/obs-trivia-game/issues';

export default function AppFooter() {
  const { t } = useTranslation();

  return (
    <footer className="app-footer">
      <p>{t('common.copyright', { year: new Date().getFullYear() })}</p>
      <a href={GITHUB_ISSUES_URL} target="_blank" rel="noreferrer">
        {t('common.reportIssue')}
      </a>
    </footer>
  );
}

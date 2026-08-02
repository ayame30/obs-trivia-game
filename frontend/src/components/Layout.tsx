import { useState } from 'react';
import { NavLink, Outlet } from 'react-router';
import { Trans, useTranslation } from 'react-i18next';
import AppFooter from './AppFooter';
import LanguageSwitcher from './LanguageSwitcher';

function isElectronApp(): boolean {
  return typeof window !== 'undefined' && Boolean(window.obsTriviaDesktop?.isElectron);
}

export default function Layout() {
  const { t } = useTranslation();
  const electron = isElectronApp();
  const [confirmClose, setConfirmClose] = useState(false);

  function handleCloseClick() {
    setConfirmClose(true);
  }

  function handleConfirmClose() {
    window.obsTriviaDesktop?.close();
  }

  return (
    <div className={`layout${electron ? ' layout--electron' : ''}`}>
      <header className={electron ? 'layout-header layout-header--electron' : 'layout-header'}>
        <div className="layout-header__brand">
          <h1 className="layout-header__title">
            <Trans
              i18nKey="layout.brand"
              components={{ highlight: <span className="layout-header__title-highlight" /> }}
            />
          </h1>
          <LanguageSwitcher />
        </div>
        <nav className="layout-header__nav">
          <NavLink to="/" end>
            {t('nav.dashboard')}
          </NavLink>
          <NavLink to="/questions">{t('nav.questions')}</NavLink>
          <NavLink to="/settings">{t('nav.settings')}</NavLink>
        </nav>
        {electron ? (
          <div className="window-controls" role="toolbar" aria-label={t('layout.windowControls')}>
            <button
              type="button"
              className="window-controls__btn"
              aria-label={t('layout.minimize')}
              title={t('layout.minimize')}
              onClick={() => window.obsTriviaDesktop?.minimize()}
            >
              <span aria-hidden="true">─</span>
            </button>
            <button
              type="button"
              className="window-controls__btn"
              aria-label={t('layout.maximize')}
              title={t('layout.maximize')}
              onClick={() => window.obsTriviaDesktop?.maximize()}
            >
              <span aria-hidden="true">☐</span>
            </button>
            <button
              type="button"
              className="window-controls__btn window-controls__btn--close"
              aria-label={t('layout.close')}
              title={t('layout.close')}
              onClick={handleCloseClick}
            >
              <span aria-hidden="true">✕</span>
            </button>
          </div>
        ) : null}
      </header>

      <main className="layout-body">
        <Outlet />
        <AppFooter />
      </main>

      {confirmClose ? (
        <div className="close-confirm" role="dialog" aria-modal="true" aria-labelledby="close-confirm-title">
          <div className="close-confirm__panel">
            <h2 id="close-confirm-title">{t('layout.closeTitle')}</h2>
            <p>{t('layout.closeBody')}</p>
            <div className="close-confirm__actions">
              <button type="button" className="close-confirm__cancel" onClick={() => setConfirmClose(false)}>
                {t('layout.cancel')}
              </button>
              <button type="button" className="close-confirm__confirm" onClick={handleConfirmClose}>
                {t('layout.closeApp')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

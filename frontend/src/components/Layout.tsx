import { useState } from 'react';
import { NavLink, Outlet } from 'react-router';

function isElectronApp(): boolean {
  return typeof window !== 'undefined' && Boolean(window.obsTriviaDesktop?.isElectron);
}

export default function Layout() {
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
          <h1 className="layout-header__title">Obs Trivia game</h1>
        </div>
        <nav className="layout-header__nav">
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/questions">Questions</NavLink>
          <NavLink to="/settings">Settings</NavLink>
        </nav>
        {electron ? (
          <div className="window-controls" role="toolbar" aria-label="Window controls">
            <button
              type="button"
              className="window-controls__btn"
              aria-label="Minimize"
              title="Minimize"
              onClick={() => window.obsTriviaDesktop?.minimize()}
            >
              <span aria-hidden="true">─</span>
            </button>
            <button
              type="button"
              className="window-controls__btn"
              aria-label="Maximize"
              title="Maximize"
              onClick={() => window.obsTriviaDesktop?.maximize()}
            >
              <span aria-hidden="true">☐</span>
            </button>
            <button
              type="button"
              className="window-controls__btn window-controls__btn--close"
              aria-label="Close"
              title="Close"
              onClick={handleCloseClick}
            >
              <span aria-hidden="true">✕</span>
            </button>
          </div>
        ) : null}
      </header>

      <main className="layout-body">
        <Outlet />
      </main>

      {confirmClose ? (
        <div className="close-confirm" role="dialog" aria-modal="true" aria-labelledby="close-confirm-title">
          <div className="close-confirm__panel">
            <h2 id="close-confirm-title">Close Obs Trivia game?</h2>
            <p>
              All Trivia Game overlays will stop working until you turn the server on again by opening this
              app.
            </p>
            <div className="close-confirm__actions">
              <button type="button" className="close-confirm__cancel" onClick={() => setConfirmClose(false)}>
                Cancel
              </button>
              <button type="button" className="close-confirm__confirm" onClick={handleConfirmClose}>
                Close Application
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

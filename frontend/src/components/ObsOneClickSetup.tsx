import { useEffect, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { FaCheck, FaPlug, FaSyncAlt } from 'react-icons/fa';
import type { OBSWebSocket } from 'obs-websocket-js';
import {
  DEFAULT_OBS_WS_PORT,
  SCOREBOARD_SOURCE_NAME,
  TRIVIA_SOURCE_NAME,
  addOverlaysToScene,
  classifyObsError,
  connectObs,
  createObsClient,
  findExistingOverlays,
  formatObsError,
  getCurrentProgramScene,
  listSceneNames,
  obsWsUrl,
  refreshOverlayCaches,
  sanitizeObsPassword,
  type ObsConnectionStatus,
} from '../lib/obsWebSocket';
import { SECRET_ACCOUNTS, getStoredSecret, setStoredSecret } from '../lib/secureSecrets';

interface ObsOneClickSetupProps {
  triviaUrl: string;
  scoreboardUrl: string;
  onOverlaysReady?: () => void;
}

export default function ObsOneClickSetup({
  triviaUrl,
  scoreboardUrl,
  onOverlaysReady,
}: ObsOneClickSetupProps) {
  const { t } = useTranslation();
  const obsRef = useRef<OBSWebSocket | null>(null);

  const [status, setStatus] = useState<ObsConnectionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<'auth' | 'unreachable' | 'other' | null>(null);
  const [port, setPort] = useState(String(DEFAULT_OBS_WS_PORT));
  const [password, setPassword] = useState('');
  const [scenes, setScenes] = useState<string[]>([]);
  const [sceneName, setSceneName] = useState('');
  const [existing, setExisting] = useState({ trivia: false, scoreboard: false });
  const [adding, setAdding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getStoredSecret(SECRET_ACCOUNTS.obsWebsocketPassword).then((stored) => {
      if (!cancelled && stored) setPassword(sanitizeObsPassword(stored));
    });
    return () => {
      cancelled = true;
      const obs = obsRef.current;
      obsRef.current = null;
      if (obs) void obs.disconnect();
    };
  }, []);

  async function handleConnect() {
    setError(null);
    setErrorKind(null);
    setSuccessMessage(null);
    setStatus('connecting');

    const previous = obsRef.current;
    if (previous) {
      try {
        await previous.disconnect();
      } catch {
        /* ignore */
      }
    }

    const portNumber = Number(port);
    if (!Number.isInteger(portNumber) || portNumber <= 0) {
      setStatus('error');
      setErrorKind('other');
      setError(t('setup.obsPortInvalid'));
      return;
    }

    const cleanedPassword = sanitizeObsPassword(password);
    const obs = createObsClient();
    obsRef.current = obs;

    try {
      await connectObs(obs, obsWsUrl(portNumber), cleanedPassword);
      await setStoredSecret(SECRET_ACCOUNTS.obsWebsocketPassword, cleanedPassword);
      setPassword(cleanedPassword);
      const sceneNames = await listSceneNames(obs);
      const current = await getCurrentProgramScene(obs);
      const found = await findExistingOverlays(obs);
      setScenes(sceneNames);
      setSceneName(sceneNames.includes(current) ? current : (sceneNames[0] ?? ''));
      setExisting(found);
      setStatus('connected');
    } catch (err) {
      obsRef.current = null;
      try {
        await obs.disconnect();
      } catch {
        /* ignore */
      }
      setScenes([]);
      setSceneName('');
      setExisting({ trivia: false, scoreboard: false });
      setStatus('error');
      setErrorKind(classifyObsError(err));
      setError(formatObsError(err));
    }
  }

  async function handleAddOverlays() {
    const obs = obsRef.current;
    if (!obs || !sceneName) return;
    setAdding(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const result = await addOverlaysToScene(obs, sceneName, triviaUrl, scoreboardUrl);
      const found = await findExistingOverlays(obs);
      setExisting(found);
      const bothExisted = result.trivia === 'exists' && result.scoreboard === 'exists';
      setSuccessMessage(
        bothExisted ? t('setup.obsAlreadyAdded') : t('setup.obsAddSuccess', { scene: sceneName })
      );
      onOverlaysReady?.();
    } catch (err) {
      setError(formatObsError(err));
    } finally {
      setAdding(false);
    }
  }

  async function handleRefresh() {
    const obs = obsRef.current;
    if (!obs) return;
    setRefreshing(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const found = await refreshOverlayCaches(obs);
      setExisting(found);
      if (!found.trivia && !found.scoreboard) {
        setError(t('setup.obsRefreshMissing'));
      } else {
        setSuccessMessage(t('setup.obsRefreshSuccess'));
      }
    } catch (err) {
      setError(formatObsError(err));
    } finally {
      setRefreshing(false);
    }
  }

  const connected = status === 'connected';
  const hasAnyOverlay = existing.trivia || existing.scoreboard;

  return (
    <div className="obs-oneclick setup-step__overlay-layout">
      <div className="obs-oneclick__copy">
        <p className="setup-step__hint">
          <Trans i18nKey="setup.obsOneClickHint" components={{ strong: <strong /> }} />
        </p>
        <p className="setup-step__hint">{t('setup.obsWsDefault')}</p>

        <div className="obs-oneclick__row">
          <label htmlFor="obs-ws-port">{t('setup.obsPort')}</label>
          <input
            id="obs-ws-port"
            type="number"
            min={1}
            value={port}
            onChange={(e) => setPort(e.target.value)}
            disabled={status === 'connecting'}
          />
        </div>

        <div className="obs-oneclick__row">
          <label htmlFor="obs-ws-password">{t('setup.obsPassword')}</label>
          <input
            id="obs-ws-password"
            type="password"
            name="obs-ws-password"
            autoComplete="new-password"
            spellCheck={false}
            value={password}
            placeholder={t('setup.obsPasswordPlaceholder')}
            onChange={(e) => setPassword(e.target.value)}
            disabled={status === 'connecting'}
          />
          <p className="setup-step__hint">{t('setup.obsPasswordHint')}</p>
        </div>

        <div className="form-actions">
          <button type="button" onClick={() => void handleConnect()} disabled={status === 'connecting'}>
            <FaPlug aria-hidden />
            {status === 'connecting'
              ? t('setup.obsConnecting')
              : connected
                ? t('setup.obsReconnect')
                : t('setup.obsConnect')}
          </button>
        </div>

        {status === 'error' ? (
          <div className="obs-oneclick__callout" role="alert">
            <p className="setup-step__error">{t('setup.obsConnectFailed')}</p>
            <p className="setup-step__hint">
              <Trans
                i18nKey={
                  errorKind === 'auth' ? 'setup.obsAuthHint' : 'setup.obsOpenHint'
                }
                components={{ strong: <strong /> }}
              />
            </p>
            {error ? <p className="setup-step__hint">{error}</p> : null}
          </div>
        ) : null}

        {connected ? (
          <>
            <div className="obs-oneclick__row">
              <label htmlFor="obs-scene">{t('setup.obsSelectScene')}</label>
              <select
                id="obs-scene"
                value={sceneName}
                onChange={(e) => setSceneName(e.target.value)}
                disabled={!scenes.length || adding}
              >
                {scenes.length === 0 ? (
                  <option value="">{t('setup.obsNoScenes')}</option>
                ) : (
                  scenes.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <p className="setup-step__hint">
              {t('setup.obsWillAdd', {
                trivia: TRIVIA_SOURCE_NAME,
                scoreboard: SCOREBOARD_SOURCE_NAME,
              })}
            </p>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => void handleAddOverlays()}
                disabled={!sceneName || adding}
              >
                <FaCheck aria-hidden />
                {adding ? t('setup.obsAdding') : t('setup.obsAddOverlays')}
              </button>
            </div>

            {hasAnyOverlay ? (
              <div className="obs-oneclick__refresh">
                <p className="setup-step__hint">{t('setup.obsRefreshHint')}</p>
                <div className="form-actions">
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => void handleRefresh()}
                    disabled={refreshing}
                  >
                    <FaSyncAlt aria-hidden />
                    {refreshing ? t('setup.obsRefreshing') : t('setup.obsRefreshCache')}
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        {successMessage ? <p className="setup-step__success">{successMessage}</p> : null}
        {connected && error ? <p className="setup-step__error">{error}</p> : null}
      </div>

      <div className="setup-step__tutor obs-oneclick__tutor">
        <figure className="obs-oneclick__figure">
          <figcaption>{t('setup.obsTutorOpenSettings')}</figcaption>
          <div className="setup-step__tutor-panel">
            <img
              className="setup-step__tutor-img"
              src="/obs-webserver-setting.png"
              alt={t('setup.obsTutorOpenSettingsAlt')}
            />
          </div>
        </figure>
        <figure className="obs-oneclick__figure">
          <figcaption>{t('setup.obsTutorGetPassword')}</figcaption>
          <div className="setup-step__tutor-panel">
            <img
              className="setup-step__tutor-img"
              src="/obs-webserver-setting-2.png"
              alt={t('setup.obsTutorGetPasswordAlt')}
            />
          </div>
        </figure>
      </div>
    </div>
  );
}

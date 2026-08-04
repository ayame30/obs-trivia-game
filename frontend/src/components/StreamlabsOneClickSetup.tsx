import { useEffect, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { FaCheck, FaPlug, FaSyncAlt } from 'react-icons/fa';
import {
  SCOREBOARD_SOURCE_NAME,
  TRIVIA_SOURCE_NAME,
} from '../lib/obsWebSocket';
import {
  DEFAULT_STREAMLABS_PORT,
  StreamlabsClient,
  formatStreamlabsError,
  type StreamlabsConnectionStatus,
  type StreamlabsScene,
} from '../lib/streamlabsWebSocket';

interface StreamlabsOneClickSetupProps {
  triviaUrl: string;
  scoreboardUrl: string;
  onOverlaysReady?: () => void;
}

export default function StreamlabsOneClickSetup({
  triviaUrl,
  scoreboardUrl,
  onOverlaysReady,
}: StreamlabsOneClickSetupProps) {
  const { t } = useTranslation();
  const clientRef = useRef<StreamlabsClient | null>(null);

  const [status, setStatus] = useState<StreamlabsConnectionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [port, setPort] = useState(String(DEFAULT_STREAMLABS_PORT));
  const [token, setToken] = useState('');
  const [scenes, setScenes] = useState<StreamlabsScene[]>([]);
  const [sceneId, setSceneId] = useState('');
  const [existing, setExisting] = useState({ trivia: false, scoreboard: false });
  const [adding, setAdding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      const client = clientRef.current;
      clientRef.current = null;
      if (client) void client.disconnect();
    };
  }, []);

  async function handleConnect() {
    setError(null);
    setSuccessMessage(null);
    setStatus('connecting');

    const previous = clientRef.current;
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
      setError(t('setup.slPortInvalid'));
      return;
    }
    if (!token.trim()) {
      setStatus('error');
      setError(t('setup.slTokenRequired'));
      return;
    }

    const client = new StreamlabsClient();
    clientRef.current = client;

    try {
      await client.connect(portNumber, token);
      const sceneList = await client.getScenes();
      const activeId = await client.getActiveSceneId();
      const found = await client.findExistingOverlays();
      setScenes(sceneList);
      setSceneId(
        sceneList.some((scene) => scene.id === activeId)
          ? activeId
          : (sceneList[0]?.id ?? '')
      );
      setExisting(found);
      setStatus('connected');
    } catch (err) {
      clientRef.current = null;
      try {
        await client.disconnect();
      } catch {
        /* ignore */
      }
      setScenes([]);
      setSceneId('');
      setExisting({ trivia: false, scoreboard: false });
      setStatus('error');
      setError(formatStreamlabsError(err));
    }
  }

  async function handleAddOverlays() {
    const client = clientRef.current;
    const scene = scenes.find((s) => s.id === sceneId);
    if (!client || !scene) return;
    setAdding(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const result = await client.addOverlaysToScene(scene, triviaUrl, scoreboardUrl);
      const found = await client.findExistingOverlays();
      setExisting(found);
      const bothExisted = result.trivia === 'exists' && result.scoreboard === 'exists';
      setSuccessMessage(
        bothExisted
          ? t('setup.obsAlreadyAdded')
          : t('setup.obsAddSuccess', { scene: scene.name })
      );
      onOverlaysReady?.();
    } catch (err) {
      setError(formatStreamlabsError(err));
    } finally {
      setAdding(false);
    }
  }

  async function handleRefresh() {
    const client = clientRef.current;
    if (!client) return;
    setRefreshing(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const found = await client.refreshOverlayCaches(triviaUrl, scoreboardUrl);
      setExisting(found);
      if (!found.trivia && !found.scoreboard) {
        setError(t('setup.obsRefreshMissing'));
      } else {
        setSuccessMessage(t('setup.obsRefreshSuccess'));
      }
    } catch (err) {
      setError(formatStreamlabsError(err));
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
          <Trans i18nKey="setup.slOneClickHint" components={{ strong: <strong /> }} />
        </p>
        <p className="setup-step__hint">{t('setup.slWsDefault')}</p>

        <div className="obs-oneclick__row">
          <label htmlFor="sl-ws-port">{t('setup.slPort')}</label>
          <input
            id="sl-ws-port"
            type="number"
            min={1}
            value={port}
            onChange={(e) => setPort(e.target.value)}
            disabled={status === 'connecting'}
          />
        </div>

        <div className="obs-oneclick__row">
          <label htmlFor="sl-ws-token">{t('setup.slToken')}</label>
          <input
            id="sl-ws-token"
            type="password"
            autoComplete="off"
            value={token}
            placeholder={t('setup.slTokenPlaceholder')}
            onChange={(e) => setToken(e.target.value)}
            disabled={status === 'connecting'}
          />
        </div>

        <div className="form-actions">
          <button type="button" onClick={() => void handleConnect()} disabled={status === 'connecting'}>
            <FaPlug aria-hidden />
            {status === 'connecting'
              ? t('setup.obsConnecting')
              : connected
                ? t('setup.obsReconnect')
                : t('setup.slConnect')}
          </button>
        </div>

        {status === 'error' ? (
          <div className="obs-oneclick__callout" role="alert">
            <p className="setup-step__error">{t('setup.slConnectFailed')}</p>
            <p className="setup-step__hint">
              <Trans i18nKey="setup.slOpenHint" components={{ strong: <strong /> }} />
            </p>
            {error ? <p className="setup-step__hint">{error}</p> : null}
          </div>
        ) : null}

        {connected ? (
          <>
            <div className="obs-oneclick__row">
              <label htmlFor="sl-scene">{t('setup.obsSelectScene')}</label>
              <select
                id="sl-scene"
                value={sceneId}
                onChange={(e) => setSceneId(e.target.value)}
                disabled={!scenes.length || adding}
              >
                {scenes.length === 0 ? (
                  <option value="">{t('setup.obsNoScenes')}</option>
                ) : (
                  scenes.map((scene) => (
                    <option key={scene.id} value={scene.id}>
                      {scene.name}
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
                disabled={!sceneId || adding}
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
          <figcaption>{t('setup.slTutorSettings')}</figcaption>
          <div className="setup-step__tutor-panel">
            <img
              className="setup-step__tutor-img"
              src="/streamlabs-webserver-setting.png"
              alt={t('setup.slTutorSettingsAlt')}
            />
          </div>
        </figure>
      </div>
    </div>
  );
}

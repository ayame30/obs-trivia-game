import { OBSWebSocket } from 'obs-websocket-js';

export const DEFAULT_OBS_WS_URL = 'ws://127.0.0.1:4455';

export const OVERLAY_BROWSER_CSS =
  'body { background-color: rgba(0, 0, 0, 0); margin: 0px auto; overflow: hidden; }';

export const TRIVIA_SOURCE_NAME = 'Obs Trivia';
export const SCOREBOARD_SOURCE_NAME = 'Obs Trivia Scoreboard';

export const OVERLAY_WIDTH = 900;
export const OVERLAY_HEIGHT = 600;

export type ObsConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

function browserSourceSettings(url: string) {
  return {
    url,
    width: OVERLAY_WIDTH,
    height: OVERLAY_HEIGHT,
    css: OVERLAY_BROWSER_CSS,
    shutdown: true,
    restart_when_active: true,
  };
}

export function createObsClient(): OBSWebSocket {
  return new OBSWebSocket();
}

export async function connectObs(
  obs: OBSWebSocket,
  url = DEFAULT_OBS_WS_URL,
  password = ''
): Promise<void> {
  await obs.connect(url, password || undefined);
}

export async function listSceneNames(obs: OBSWebSocket): Promise<string[]> {
  const { scenes } = await obs.call('GetSceneList');
  return (scenes ?? [])
    .map((scene) => String((scene as { sceneName?: string }).sceneName ?? ''))
    .filter(Boolean);
}

export async function getCurrentProgramScene(obs: OBSWebSocket): Promise<string> {
  const { currentProgramSceneName } = await obs.call('GetCurrentProgramScene');
  return currentProgramSceneName;
}

export async function inputExists(obs: OBSWebSocket, inputName: string): Promise<boolean> {
  try {
    await obs.call('GetInputSettings', { inputName });
    return true;
  } catch {
    return false;
  }
}

export async function findExistingOverlays(obs: OBSWebSocket): Promise<{
  trivia: boolean;
  scoreboard: boolean;
}> {
  const [trivia, scoreboard] = await Promise.all([
    inputExists(obs, TRIVIA_SOURCE_NAME),
    inputExists(obs, SCOREBOARD_SOURCE_NAME),
  ]);
  return { trivia, scoreboard };
}

async function ensureBrowserSourceInScene(
  obs: OBSWebSocket,
  sceneName: string,
  inputName: string,
  url: string
): Promise<'created' | 'exists'> {
  const exists = await inputExists(obs, inputName);
  if (!exists) {
    await obs.call('CreateInput', {
      sceneName,
      inputName,
      inputKind: 'browser_source',
      sceneItemEnabled: true,
      inputSettings: browserSourceSettings(url),
    });
    return 'created';
  }

  try {
    await obs.call('CreateSceneItem', {
      sceneName,
      sourceName: inputName,
      sceneItemEnabled: true,
    });
  } catch {
    /* Already present in this scene (or cannot duplicate) — treat as exists. */
  }
  return 'exists';
}

export async function addOverlaysToScene(
  obs: OBSWebSocket,
  sceneName: string,
  triviaUrl: string,
  scoreboardUrl: string
): Promise<{ trivia: 'created' | 'exists'; scoreboard: 'created' | 'exists' }> {
  const trivia = await ensureBrowserSourceInScene(obs, sceneName, TRIVIA_SOURCE_NAME, triviaUrl);
  const scoreboard = await ensureBrowserSourceInScene(
    obs,
    sceneName,
    SCOREBOARD_SOURCE_NAME,
    scoreboardUrl
  );
  return { trivia, scoreboard };
}

export async function refreshBrowserSourceCache(
  obs: OBSWebSocket,
  inputName: string
): Promise<void> {
  await obs.call('PressInputPropertiesButton', {
    inputName,
    propertyName: 'refreshnocache',
  });
}

export async function refreshOverlayCaches(obs: OBSWebSocket): Promise<{
  trivia: boolean;
  scoreboard: boolean;
}> {
  const existing = await findExistingOverlays(obs);
  if (existing.trivia) {
    await refreshBrowserSourceCache(obs, TRIVIA_SOURCE_NAME);
  }
  if (existing.scoreboard) {
    await refreshBrowserSourceCache(obs, SCOREBOARD_SOURCE_NAME);
  }
  return existing;
}

export function formatObsError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return String(err);
}

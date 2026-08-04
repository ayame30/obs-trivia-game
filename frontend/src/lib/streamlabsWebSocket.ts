import SockJS from 'sockjs-client';
import {
  OVERLAY_BROWSER_CSS,
  OVERLAY_HEIGHT,
  OVERLAY_WIDTH,
  SCOREBOARD_SOURCE_NAME,
  TRIVIA_SOURCE_NAME,
} from './obsWebSocket';

export const DEFAULT_STREAMLABS_PORT = 59650;

export type StreamlabsConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

export interface StreamlabsScene {
  id: string;
  name: string;
  resourceId: string;
}

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params: { resource: string; args?: unknown[] };
}

interface JsonRpcError {
  message?: string;
  code?: number;
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
}

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

export function formatStreamlabsError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return String(err);
}

export class StreamlabsClient {
  private socket: WebSocket | null = null;
  private nextId = 1;
  private pending = new Map<number, PendingRequest>();

  async connect(port: number, token: string): Promise<void> {
    await this.disconnect();

    const url = `http://127.0.0.1:${port}/api`;
    const sock = new SockJS(url) as unknown as WebSocket;

    await new Promise<void>((resolve, reject) => {
      const onOpen = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error(`Failed to reach Streamlabs at ${url}`));
      };
      const onClose = () => {
        cleanup();
        reject(new Error(`Streamlabs closed the connection (${url})`));
      };
      const cleanup = () => {
        sock.removeEventListener('open', onOpen);
        sock.removeEventListener('error', onError);
        sock.removeEventListener('close', onClose);
      };
      sock.addEventListener('open', onOpen);
      sock.addEventListener('error', onError);
      sock.addEventListener('close', onClose);
    });

    this.socket = sock;
    sock.addEventListener('message', (event) => this.handleMessage(String(event.data)));
    sock.addEventListener('close', () => {
      this.rejectAll(new Error('Disconnected from Streamlabs'));
      this.socket = null;
    });

    await this.request('TcpServerService', 'auth', token.trim());
  }

  async disconnect(): Promise<void> {
    const sock = this.socket;
    this.socket = null;
    this.rejectAll(new Error('Disconnected'));
    if (!sock) return;
    try {
      sock.close();
    } catch {
      /* ignore */
    }
  }

  async getScenes(): Promise<StreamlabsScene[]> {
    const scenes = (await this.request('ScenesService', 'getScenes')) as Array<{
      id?: string;
      name?: string;
      resourceId?: string;
    }>;
    return (scenes ?? [])
      .map((scene) => ({
        id: String(scene.id ?? ''),
        name: String(scene.name ?? ''),
        resourceId: String(scene.resourceId ?? ''),
      }))
      .filter((scene) => scene.id && scene.name && scene.resourceId);
  }

  async getActiveSceneId(): Promise<string> {
    return String(await this.request('ScenesService', 'activeSceneId'));
  }

  async getSources(): Promise<Array<{ name: string; resourceId: string; sourceId: string }>> {
    const sources = (await this.request('SourcesService', 'getSources')) as Array<{
      name?: string;
      resourceId?: string;
      sourceId?: string;
      id?: string;
    }>;
    return (sources ?? [])
      .map((source) => ({
        name: String(source.name ?? ''),
        resourceId: String(source.resourceId ?? ''),
        sourceId: String(source.sourceId ?? source.id ?? ''),
      }))
      .filter((source) => source.name && source.resourceId);
  }

  async findExistingOverlays(): Promise<{ trivia: boolean; scoreboard: boolean }> {
    const sources = await this.getSources();
    const names = new Set(sources.map((s) => s.name));
    return {
      trivia: names.has(TRIVIA_SOURCE_NAME),
      scoreboard: names.has(SCOREBOARD_SOURCE_NAME),
    };
  }

  async addOverlaysToScene(
    scene: StreamlabsScene,
    triviaUrl: string,
    scoreboardUrl: string
  ): Promise<{ trivia: 'created' | 'exists'; scoreboard: 'created' | 'exists' }> {
    const existing = await this.findExistingOverlays();
    const trivia = existing.trivia
      ? 'exists'
      : await this.createBrowserSource(scene, TRIVIA_SOURCE_NAME, triviaUrl);
    const scoreboard = existing.scoreboard
      ? 'exists'
      : await this.createBrowserSource(scene, SCOREBOARD_SOURCE_NAME, scoreboardUrl);
    return { trivia, scoreboard };
  }

  async refreshOverlayCaches(
    triviaUrl: string,
    scoreboardUrl: string
  ): Promise<{ trivia: boolean; scoreboard: boolean }> {
    const sources = await this.getSources();
    const trivia = sources.find((s) => s.name === TRIVIA_SOURCE_NAME);
    const scoreboard = sources.find((s) => s.name === SCOREBOARD_SOURCE_NAME);

    if (trivia) await this.refreshBrowserSource(trivia.resourceId, triviaUrl);
    if (scoreboard) await this.refreshBrowserSource(scoreboard.resourceId, scoreboardUrl);

    return { trivia: Boolean(trivia), scoreboard: Boolean(scoreboard) };
  }

  private async createBrowserSource(
    scene: StreamlabsScene,
    inputName: string,
    url: string
  ): Promise<'created'> {
    await this.request(
      scene.resourceId,
      'createAndAddSource',
      inputName,
      'browser_source',
      browserSourceSettings(url)
    );
    return 'created';
  }

  private async refreshBrowserSource(resourceId: string, url: string): Promise<void> {
    const bust = `${url}${url.includes('?') ? '&' : '?'}_refresh=${Date.now()}`;
    await this.request(resourceId, 'updateSettings', {
      ...browserSourceSettings(bust),
    });
    await this.request(resourceId, 'updateSettings', {
      ...browserSourceSettings(url),
    });
  }

  private request(resource: string, method: string, ...args: unknown[]): Promise<unknown> {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error('Not connected to Streamlabs'));
    }

    const id = this.nextId++;
    const body: JsonRpcRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params: { resource, args },
    };

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      try {
        this.socket!.send(JSON.stringify(body));
      } catch (err) {
        this.pending.delete(id);
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  private handleMessage(raw: string): void {
    let message: { id?: number; result?: unknown; error?: JsonRpcError };
    try {
      message = JSON.parse(raw) as { id?: number; result?: unknown; error?: JsonRpcError };
    } catch {
      return;
    }

    if (message.id == null) return;
    const pending = this.pending.get(message.id);
    if (!pending) return;
    this.pending.delete(message.id);

    if (message.error) {
      pending.reject(new Error(message.error.message || 'Streamlabs request failed'));
      return;
    }
    pending.resolve(message.result);
  }

  private rejectAll(error: Error): void {
    for (const pending of this.pending.values()) {
      pending.reject(error);
    }
    this.pending.clear();
  }
}

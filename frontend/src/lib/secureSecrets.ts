const KEYTAR_SERVICE = 'obs-trivia-game';

export const SECRET_ACCOUNTS = {
  obsWebsocketPassword: 'obs-websocket-password',
  streamlabsApiToken: 'streamlabs-api-token',
} as const;

export type SecretAccount = (typeof SECRET_ACCOUNTS)[keyof typeof SECRET_ACCOUNTS];

function desktopApi() {
  return typeof window !== 'undefined' ? window.obsTriviaDesktop : undefined;
}

export async function getStoredSecret(account: SecretAccount): Promise<string> {
  const api = desktopApi();
  if (!api?.getSecret) return '';
  try {
    const value = await api.getSecret(KEYTAR_SERVICE, account);
    return value ?? '';
  } catch {
    return '';
  }
}

export async function setStoredSecret(account: SecretAccount, value: string): Promise<void> {
  const api = desktopApi();
  if (!api?.setSecret || !api?.deleteSecret) return;
  const trimmed = value.trim();
  try {
    if (!trimmed) {
      await api.deleteSecret(KEYTAR_SERVICE, account);
      return;
    }
    await api.setSecret(KEYTAR_SERVICE, account, trimmed);
  } catch {
    /* ignore keychain failures in UI */
  }
}

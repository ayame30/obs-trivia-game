const SCOPES = ['openid', 'chat:read', 'chat:edit'].join(' ');

export function getTwitchClientId(): string | null {
  const clientId = import.meta.env.VITE_TWITCH_CLIENT_ID;
  if (!clientId || clientId === 'your_twitch_client_id') return null;
  return clientId;
}

export function getTwitchOAuthUrl(redirectPath = '/'): string | null {
  const clientId = getTwitchClientId();
  if (!clientId) return null;
  const redirectUri = encodeURIComponent(`${window.location.origin}${redirectPath}`);
  return `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=${encodeURIComponent(SCOPES)}`;
}

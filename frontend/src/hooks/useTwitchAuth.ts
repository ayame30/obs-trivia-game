import { useEffect, useState } from 'react';
import type { TwitchStoredAuth } from '../types';

const STORAGE_KEY = 'stream_trivia_twitch';

function readHashToken(): string | null {
  const hash = window.location.hash.replace('#', '');
  if (!hash) return null;
  const params = new URLSearchParams(hash.startsWith('/') ? hash.slice(1) : hash);
  return params.get('access_token');
}

function loadStored(): TwitchStoredAuth | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TwitchStoredAuth) : null;
  } catch {
    return null;
  }
}

function saveStored(data: TwitchStoredAuth): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useTwitchAuth() {
  const [accessToken, setAccessToken] = useState(() => loadStored()?.accessToken ?? '');
  const [login, setLogin] = useState(() => loadStored()?.login ?? '');
  const [userId, setUserId] = useState(() => loadStored()?.userId ?? '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fromHash = readHashToken();
    if (fromHash) {
      setAccessToken(fromHash);
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  useEffect(() => {
    if (!accessToken) return;

    setLoading(true);
    fetch('https://id.twitch.tv/oauth2/validate', {
      headers: { Authorization: `OAuth ${accessToken}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Invalid token');
        return res.json() as Promise<{ login: string; user_id: string }>;
      })
      .then((user) => {
        setLogin(user.login);
        setUserId(String(user.user_id));
        saveStored({
          accessToken,
          login: user.login,
          userId: String(user.user_id),
        });
      })
      .catch(() => {
        setAccessToken('');
        setLogin('');
        setUserId('');
        sessionStorage.removeItem(STORAGE_KEY);
      })
      .finally(() => setLoading(false));
  }, [accessToken]);

  const logout = () => {
    setAccessToken('');
    setLogin('');
    setUserId('');
    sessionStorage.removeItem(STORAGE_KEY);
  };

  return { accessToken, login, userId, loading, logout };
}

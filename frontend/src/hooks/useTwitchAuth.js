import { useEffect, useState } from 'react';

const STORAGE_KEY = 'stream_trivia_twitch';

function readHashToken() {
  const hash = window.location.hash.replace('#', '');
  if (!hash) return null;
  const params = new URLSearchParams(hash.startsWith('/') ? hash.slice(1) : hash);
  return params.get('access_token');
}

function loadStored() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveStored(data) {
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
        console.log(res);
        if (!res.ok) throw new Error('Invalid token');
        return res.json();
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

  return { accessToken, login, userId, loading };
}

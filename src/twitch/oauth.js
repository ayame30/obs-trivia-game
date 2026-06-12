export async function validateTwitchToken(accessToken) {
  const res = await fetch('https://id.twitch.tv/oauth2/validate', {
    headers: { Authorization: `OAuth ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Invalid Twitch token: ${res.status} ${text}`);
  }
  return res.json();
}

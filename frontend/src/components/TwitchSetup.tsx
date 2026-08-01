import { useMutation, useQuery } from '@apollo/client/react';
import { GET_TWITCH_CONFIG, SET_TWITCH_TOKEN, RECONNECT_TWITCH } from '../graphql/operations';
import type { GetTwitchConfigData } from '../types';

interface TwitchSetupProps {
  accessToken: string;
  channel: string;
}

export default function TwitchSetup({ accessToken, channel }: TwitchSetupProps) {
  const { data, refetch } = useQuery<GetTwitchConfigData>(GET_TWITCH_CONFIG);
  const [setToken, { loading, error }] = useMutation(SET_TWITCH_TOKEN, {
    onCompleted: () => refetch(),
  });
  const [reconnect, { loading: reconnecting }] = useMutation(RECONNECT_TWITCH);

  const config = data?.twitchConfig;

  const saveToken = () => {
    if (!accessToken) return;
    setToken({
      variables: {
        accessToken,
        channel: channel || undefined,
      },
    });
  };

  return (
    <div className="card">
      <h2>Twitch chat</h2>
      {config?.hasToken ? (
        <p>
          Connected as <strong>{config.login}</strong> on channel <strong>#{config.channel}</strong>
        </p>
      ) : (
        <p style={{ color: 'var(--muted)' }}>
          Link your broadcaster OAuth token so chat votes (A/B/C/D) are counted.
        </p>
      )}

      {accessToken ? (
        <div className="form-actions">
          <button type="button" onClick={saveToken} disabled={loading}>
            {loading ? 'Saving…' : config?.hasToken ? 'Update token' : 'Connect Twitch chat'}
          </button>
          {config?.hasToken && (
            <button
              type="button"
              className="secondary"
              disabled={reconnecting}
              onClick={() => reconnect()}
            >
              Reconnect IRC
            </button>
          )}
        </div>
      ) : (
        <p>
          <a href="/auth">Sign in with Twitch</a> first, then return here.
        </p>
      )}

      {error && <p style={{ color: 'var(--danger)' }}>{error.message}</p>}
    </div>
  );
}

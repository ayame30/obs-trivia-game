import { Injectable } from '@nestjs/common';

export interface TwitchUser {
  login: string;
  user_id: string;
}

@Injectable()
export class TwitchOAuthService {
  async validateToken(accessToken: string): Promise<TwitchUser> {
    const res = await fetch('https://id.twitch.tv/oauth2/validate', {
      headers: { Authorization: `OAuth ${accessToken}` },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Invalid Twitch token: ${res.status} ${text}`);
    }
    return res.json() as Promise<TwitchUser>;
  }
}

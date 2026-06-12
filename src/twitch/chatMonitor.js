import WebSocket from 'ws';
import {
  getActiveRound,
  getTwitchConfig,
  getTwitchAccessToken,
  recordVote,
  getVoteCounts,
  getScoreboard,
  mapRound,
  mapScoreboardEntry,
} from '../db.js';
import { pubsub, TOPICS } from '../pubsub.js';

const TWITCH_IRC = process.env.TWITCH_CHAT_WSS || 'wss://irc-ws.chat.twitch.tv';

/** Parse chat message as answer: A, B, C, D (optional leading !) */
export function parseAnswer(message) {
  const trimmed = message.trim();
  const match = trimmed.match(/^!?([ABCD])$/i);
  return match ? match[1].toUpperCase() : null;
}

function parseIrcTags(tagSection) {
  const info = {};
  for (const part of tagSection.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    info[part.slice(0, eq)] = part.slice(eq + 1);
  }
  return info;
}

function parsePrivmsg(raw) {
  if (!raw.includes('PRIVMSG')) return null;
  const [tagSection, rest] = raw.split(' PRIVMSG ');
  const info = parseIrcTags(tagSection.replace(/^@/, ''));
  const messageStart = rest.indexOf(':');
  const message = messageStart >= 0 ? rest.slice(messageStart + 1).trim() : '';
  return {
    displayName: info['display-name'],
    userId: info['user-id'],
    message,
  };
}

export class TwitchChatMonitor {
  constructor() {
    this.ws = null;
    this.reconnectTimer = null;
    this.connected = false;
  }

  async connect() {
    const token = getTwitchAccessToken();
    const config = getTwitchConfig();
    if (!token || !config) {
      console.log('[twitch] No token configured, chat monitor idle');
      return false;
    }

    this.disconnect();
    const login = config.login;
    const channel = config.channel || login;

    return new Promise((resolve) => {
      this.ws = new WebSocket(TWITCH_IRC);

      this.ws.on('open', () => {
        this.ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
        this.ws.send(`PASS oauth:${token}`);
        this.ws.send(`NICK ${login}`);
        this.ws.send(`JOIN #${channel.toLowerCase()}`);
        this.connected = true;
        console.log(`[twitch] Connected to #${channel}`);
        resolve(true);
      });

      this.ws.on('message', (data) => {
        const raw = data.toString();
        if (raw.includes('PING :tmi.twitch.tv')) {
          this.ws.send('PONG :tmi.twitch.tv');
          return;
        }
        this.handleMessage(raw);
      });

      this.ws.on('close', () => {
        this.connected = false;
        console.log('[twitch] Disconnected, reconnecting in 10s');
        this.scheduleReconnect();
      });

      this.ws.on('error', (err) => {
        console.error('[twitch] WebSocket error:', err.message);
      });
    });
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 10000);
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }

  handleMessage(raw) {
    const msg = parsePrivmsg(raw);
    if (!msg?.userId || !msg.displayName) return;

    const answer = parseAnswer(msg.message);
    if (!answer) return;

    const active = getActiveRound();
    if (!active) return;

    const vote = recordVote({
      roundId: active.id,
      twitchUserId: msg.userId,
      displayName: msg.displayName,
      answer,
    });

    if (vote) {
      const counts = getVoteCounts(active.id);
      pubsub.publish(TOPICS.VOTE_COUNTS_UPDATED, { voteCountsUpdated: counts });
    }
  }

  isConnected() {
    return this.connected;
  }
}

export const chatMonitor = new TwitchChatMonitor();

export async function publishScoreboard() {
  const entries = getScoreboard().map(mapScoreboardEntry);
  pubsub.publish(TOPICS.SCOREBOARD_UPDATED, { scoreboardUpdated: entries });
  return entries;
}

export function publishQuestionStarted(roundRow) {
  const round = mapRound(roundRow);
  pubsub.publish(TOPICS.QUESTION_STARTED, { questionStarted: round });
  return round;
}

export function publishQuestionEnded(roundRow) {
  const round = mapRound(roundRow, { revealAnswer: true });
  pubsub.publish(TOPICS.QUESTION_ENDED, { questionEnded: round });
  return round;
}

export function publishCountdownUpdated(roundRow) {
  const round = mapRound(roundRow);
  pubsub.publish(TOPICS.COUNTDOWN_UPDATED, { countdownUpdated: round });
  return round;
}

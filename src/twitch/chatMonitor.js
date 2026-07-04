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
const TWITCH_MSG_MAX_LEN = 500;
const DEADLINE_MESSAGE = '===== END =====';

/** Parse chat message as answer: A, B, C, D (optional leading !) */
export function parseAnswer(message) {
  const trimmed = message.trim();
  const match = trimmed.match(/^!?([ABCD])$/i);
  return match ? match[1].toUpperCase() : null;
}

export function formatQuestionForChat(roundRow) {
  return [
    `Q${roundRow.id}: ${roundRow.text}`,
    `A ) ${roundRow.option_a}`,
    `B ) ${roundRow.option_b}`,
    `C ) ${roundRow.option_c}`,
    `D ) ${roundRow.option_d}`,
  ].join('\n');
}

function splitChatLines(text, maxLen = TWITCH_MSG_MAX_LEN) {
  const chunks = [];
  for (const line of String(text).split('\n')) {
    if (!line) {
      chunks.push('');
      continue;
    }
    let rest = line;
    while (rest.length > maxLen) {
      chunks.push(rest.slice(0, maxLen));
      rest = rest.slice(maxLen);
    }
    chunks.push(rest);
  }
  return chunks;
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
    this.countdownTimer = null;
    this.countdownRoundId = null;
    this.chatLog = [];
    this.chatLogRoundId = null;
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
        const active = getActiveRound();
        if (active) {
          if (this.chatLogRoundId !== active.id) {
            this.resetChatLog(active.id);
          }
          this.scheduleCountdownEnd(active);
        }
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
    this.clearCountdownTimer();
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }

  getChannelName() {
    const config = getTwitchConfig();
    if (!config) return null;
    return (config.channel || config.login).toLowerCase();
  }

  sendChatMessage(text) {
    if (!this.ws || !this.connected) {
      console.log('[twitch] Chat not connected, skipping message');
      return false;
    }
    const channel = this.getChannelName();
    if (!channel) return false;

      console.log(`PRIVMSG #${channel} :${text}\r\n`);
      this.ws.send(`PRIVMSG #${channel} :${text}\r\n`);

    return true;
  }

  clearCountdownTimer() {
    if (this.countdownTimer) {
      clearTimeout(this.countdownTimer);
      this.countdownTimer = null;
    }
    this.countdownRoundId = null;
  }

  resetChatLog(roundId) {
    this.chatLog = [];
    this.chatLogRoundId = roundId;
  }

  clearChatLog() {
    this.chatLog = [];
    this.chatLogRoundId = null;
  }

  appendChatLog(msg) {
    this.chatLog.push({
      displayName: msg.displayName,
      userId: msg.userId,
      message: msg.message,
      at: new Date().toISOString(),
    });
  }

  logChatLogBeforeDeadline(roundId) {
    if (this.chatLogRoundId !== roundId) return;
    const label = `Round #${roundId}`;
    if (this.chatLog.length === 0) {
      console.log(`[twitch] ${label} chat log before deadline: (no messages)`);
      return;
    }
    console.log(`[twitch] ${label} chat log before deadline (${this.chatLog.length} messages):`);
    for (const entry of this.chatLog) {
      console.log(`  [${entry.at}] ${entry.displayName}: ${entry.message}`);
    }
  }

  scheduleCountdownEnd(roundRow) {
    this.clearCountdownTimer();
    if (!roundRow || roundRow.status !== 'active' || roundRow.countdown_paused) {
      return;
    }
    if (!roundRow.countdown_ends_at) return;

    const roundId = roundRow.id;
    const delayMs = Math.max(0, new Date(roundRow.countdown_ends_at).getTime() - Date.now());
    this.countdownRoundId = roundId;
    this.countdownTimer = setTimeout(() => {
      this.countdownTimer = null;
      this.countdownRoundId = null;
      const active = getActiveRound();
      if (!active || active.id !== roundId || active.status !== 'active') return;
      if (active.countdown_paused) return;
      this.logChatLogBeforeDeadline(roundId);
      this.sendChatMessage(DEADLINE_MESSAGE);
    }, delayMs);
  }

  onQuestionStarted(roundRow) {
    this.resetChatLog(roundRow.id);
    this.sendChatMessage(formatQuestionForChat(roundRow));
    this.scheduleCountdownEnd(roundRow);
  }

  onCountdownUpdated(roundRow) {
    this.scheduleCountdownEnd(roundRow);
  }

  onQuestionEnded() {
    this.clearCountdownTimer();
    this.clearChatLog();
  }

  handleMessage(raw) {
    const msg = parsePrivmsg(raw);
    if (!msg?.userId || !msg.displayName) return;

    const active = getActiveRound();
    if (active && active.id === this.chatLogRoundId) {
      this.appendChatLog(msg);
    }

    const answer = parseAnswer(msg.message);
    if (!answer) return;

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
  chatMonitor.onQuestionStarted(roundRow);
  const round = mapRound(roundRow);
  pubsub.publish(TOPICS.QUESTION_STARTED, { questionStarted: round });
  return round;
}

export function publishQuestionEnded(roundRow) {
  chatMonitor.onQuestionEnded();
  const round = mapRound(roundRow, { revealAnswer: true });
  pubsub.publish(TOPICS.QUESTION_ENDED, { questionEnded: round });
  return round;
}

export function publishCountdownUpdated(roundRow) {
  chatMonitor.onCountdownUpdated(roundRow);
  const round = mapRound(roundRow);
  pubsub.publish(TOPICS.COUNTDOWN_UPDATED, { countdownUpdated: round });
  return round;
}

export function restoreActiveRoundCountdown() {
  const active = getActiveRound();
  if (active) {
    chatMonitor.scheduleCountdownEnd(active);
  }
}

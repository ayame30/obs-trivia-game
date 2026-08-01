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
import type {
  AnswerChoice,
  ChatLogEntry,
  ParsedPrivmsg,
  Round,
  RoundRow,
  ScoreboardEntry,
} from '../types.js';

const TWITCH_IRC = process.env.TWITCH_CHAT_WSS || 'wss://irc-ws.chat.twitch.tv';
const DEADLINE_MESSAGE = '===== END =====';

/** Parse chat message as answer: A, B, C, D (optional leading !) */
export function parseAnswer(message: string): AnswerChoice | null {
  const trimmed = message.trim();
  const match = trimmed.match(/^!?([ABCD])$/i);
  return match ? (match[1].toUpperCase() as AnswerChoice) : null;
}

export function formatQuestionForChat(roundRow: RoundRow): string {
  return [
    `Q${roundRow.id}: ${roundRow.text}`,
    `A ) ${roundRow.option_a}`,
    `B ) ${roundRow.option_b}`,
    `C ) ${roundRow.option_c}`,
    `D ) ${roundRow.option_d}`,
  ].join('\n');
}

function parseIrcTags(tagSection: string): Record<string, string> {
  const info: Record<string, string> = {};
  for (const part of tagSection.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    info[part.slice(0, eq)] = part.slice(eq + 1);
  }
  return info;
}

function parsePrivmsg(raw: string): ParsedPrivmsg | null {
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
  ws: WebSocket | null = null;
  reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  connected = false;
  countdownTimer: ReturnType<typeof setTimeout> | null = null;
  countdownRoundId: number | null = null;
  chatLog: ChatLogEntry[] = [];
  chatLogRoundId: number | null = null;
  deadlineSentForRoundId: number | null = null;

  async connect(): Promise<boolean> {
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
        this.ws!.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
        this.ws!.send(`PASS oauth:${token}`);
        this.ws!.send(`NICK ${login}`);
        this.ws!.send(`JOIN #${channel.toLowerCase()}`);
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
          this.ws!.send('PONG :tmi.twitch.tv');
          return;
        }
        this.handleMessage(raw);
      });

      this.ws.on('close', () => {
        this.connected = false;
        console.log('[twitch] Disconnected, reconnecting in 10s');
        this.scheduleReconnect();
      });

      this.ws.on('error', (err: Error) => {
        console.error('[twitch] WebSocket error:', err.message);
      });
    });
  }

  scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 10000);
  }

  disconnect(): void {
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

  getChannelName(): string | null {
    const config = getTwitchConfig();
    if (!config) return null;
    return (config.channel || config.login).toLowerCase();
  }

  sendChatMessage(text: string): boolean {
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

  clearCountdownTimer(): void {
    if (this.countdownTimer) {
      clearTimeout(this.countdownTimer);
      this.countdownTimer = null;
    }
    this.countdownRoundId = null;
  }

  resetChatLog(roundId: number): void {
    this.chatLog = [];
    this.chatLogRoundId = roundId;
  }

  clearChatLog(): void {
    this.chatLog = [];
    this.chatLogRoundId = null;
  }

  appendChatLog(msg: ParsedPrivmsg): void {
    this.chatLog.push({
      displayName: msg.displayName,
      userId: msg.userId,
      message: msg.message,
      at: new Date().toISOString(),
    });
  }

  logChatLogBeforeDeadline(roundId: number): void {
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

  sendDeadlineIfNeeded(roundId: number | null | undefined): void {
    if (!roundId || this.deadlineSentForRoundId === roundId) return;
    this.deadlineSentForRoundId = roundId;
    this.logChatLogBeforeDeadline(roundId);
    this.sendChatMessage(DEADLINE_MESSAGE);
  }

  scheduleCountdownEnd(roundRow: RoundRow | null | undefined): void {
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
      this.sendDeadlineIfNeeded(roundId);
    }, delayMs);
  }

  onQuestionStarted(roundRow: RoundRow): void {
    this.deadlineSentForRoundId = null;
    this.resetChatLog(roundRow.id);
    this.sendChatMessage(formatQuestionForChat(roundRow));
    this.scheduleCountdownEnd(roundRow);
  }

  onCountdownUpdated(roundRow: RoundRow): void {
    this.scheduleCountdownEnd(roundRow);
  }

  onQuestionEnded(roundRow: RoundRow | null | undefined): void {
    this.clearCountdownTimer();
    this.sendDeadlineIfNeeded(roundRow?.id ?? this.chatLogRoundId);
    this.clearChatLog();
  }

  handleMessage(raw: string): void {
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

  isConnected(): boolean {
    return this.connected;
  }
}

export const chatMonitor = new TwitchChatMonitor();

export async function publishScoreboard(): Promise<ScoreboardEntry[]> {
  const entries = getScoreboard().map(mapScoreboardEntry);
  pubsub.publish(TOPICS.SCOREBOARD_UPDATED, { scoreboardUpdated: entries });
  return entries;
}

export function publishQuestionStarted(roundRow: RoundRow): Round {
  chatMonitor.onQuestionStarted(roundRow);
  const round = mapRound(roundRow)!;
  pubsub.publish(TOPICS.QUESTION_STARTED, { questionStarted: round });
  return round;
}

export function publishQuestionEnded(roundRow: RoundRow): Round {
  chatMonitor.onQuestionEnded(roundRow);
  const round = mapRound(roundRow, { revealAnswer: true })!;
  pubsub.publish(TOPICS.QUESTION_ENDED, { questionEnded: round });
  return round;
}

export function publishCountdownUpdated(roundRow: RoundRow): Round {
  chatMonitor.onCountdownUpdated(roundRow);
  const round = mapRound(roundRow)!;
  pubsub.publish(TOPICS.COUNTDOWN_UPDATED, { countdownUpdated: round });
  return round;
}

export function restoreActiveRoundCountdown(): void {
  const active = getActiveRound();
  if (active) {
    chatMonitor.scheduleCountdownEnd(active);
  }
}

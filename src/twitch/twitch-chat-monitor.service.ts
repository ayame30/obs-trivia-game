import { forwardRef, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import WebSocket from 'ws';
import { AnswerChoice } from '../common/constants';
import { formatQuestionForChat, parseAnswer } from '../common/mappers';
import { Round } from '../entities/round.entity';
import { RoundEventsService } from '../rounds/round-events.service';
import { RoundsService } from '../rounds/rounds.service';
import { SettingsService } from '../settings/settings.service';
import { TwitchConfigService } from './twitch-config.service';

const TWITCH_IRC = process.env.TWITCH_CHAT_WSS || 'wss://irc-ws.chat.twitch.tv';

interface ChatLogEntry {
  displayName: string;
  userId: string;
  message: string;
  at: string;
}

interface ParsedPrivmsg {
  displayName: string;
  userId: string;
  message: string;
}

@Injectable()
export class TwitchChatMonitorService implements OnModuleInit {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connected = false;
  private countdownTimer: ReturnType<typeof setTimeout> | null = null;
  private channelName: string | null = null;
  private chatLog: ChatLogEntry[] = [];
  private chatLogRoundId: number | null = null;
  private deadlineSentForRoundId: number | null = null;

  constructor(
    private readonly twitchConfigService: TwitchConfigService,
    @Inject(forwardRef(() => RoundsService))
    private readonly roundsService: RoundsService,
    private readonly roundEventsService: RoundEventsService,
    private readonly settingsService: SettingsService
  ) {}

  async onModuleInit() {
    const token = await this.twitchConfigService.getAccessToken();
    if (token) {
      await this.connect();
      await this.restoreActiveRoundCountdown();
    }
  }

  async connect(): Promise<boolean> {
    const token = await this.twitchConfigService.getAccessToken();
    const config = await this.twitchConfigService.findOne();
    if (!token || !config) {
      console.log('[twitch] No token configured, chat monitor idle');
      return false;
    }

    this.disconnect();
    const login = config.login;
    this.channelName = (config.channel || login).toLowerCase();

    return new Promise((resolve) => {
      this.ws = new WebSocket(TWITCH_IRC);

      this.ws.on('open', () => {
        this.ws!.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
        this.ws!.send(`PASS oauth:${token}`);
        this.ws!.send(`NICK ${login}`);
        this.ws!.send(`JOIN #${this.channelName}`);
        this.connected = true;
        console.log(`[twitch] Connected to #${this.channelName}`);
        void this.roundsService.findActive().then((active) => {
          if (active) {
            if (this.chatLogRoundId !== active.id) {
              this.resetChatLog(active.id);
            }
            this.scheduleCountdownEnd(active);
          }
        });
        resolve(true);
      });

      this.ws.on('message', (data) => {
        const raw = data.toString();
        if (raw.includes('PING :tmi.twitch.tv')) {
          this.ws!.send('PONG :tmi.twitch.tv');
          return;
        }
        void this.handleMessage(raw);
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

  isConnected(): boolean {
    return this.connected;
  }

  sendMessage(text: string): boolean {
    const trimmed = text.trim();
    if (!trimmed) {
      throw new Error('Message cannot be empty');
    }
    const sent = this.sendChatMessage(trimmed);
    if (!sent) {
      throw new Error('Twitch chat is not connected');
    }
    return true;
  }

  onQuestionStarted(round: Round): void {
    this.deadlineSentForRoundId = null;
    this.resetChatLog(round.id);
    void this.sendQuestionMessage(round);
    this.scheduleCountdownEnd(round);
  }

  onCountdownUpdated(round: Round): void {
    this.scheduleCountdownEnd(round);
  }

  onQuestionEnded(round: Round | null | undefined): void {
    this.clearCountdownTimer();
    void this.sendDeadlineIfNeeded(round);
    this.clearChatLog();
  }

  private async sendQuestionMessage(round: Round): Promise<void> {
    const settings = await this.settingsService.getSettings();
    if (!settings.showQuestionChat) return;
    this.sendChatMessage(formatQuestionForChat(round, settings.questionChatTemplate));
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
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
    this.channelName = null;
  }

  private async restoreActiveRoundCountdown(): Promise<void> {
    const active = await this.roundsService.findActive();
    if (active) {
      this.scheduleCountdownEnd(active);
    }
  }

  private sendChatMessage(text: string): boolean {
    if (!this.ws || !this.connected || !this.channelName) {
      console.log('[twitch] Chat not connected, skipping message');
      return false;
    }
    console.log(`PRIVMSG #${this.channelName} :${text}\r\n`);
    this.ws.send(`PRIVMSG #${this.channelName} :${text}\r\n`);
    return true;
  }

  private clearCountdownTimer(): void {
    if (this.countdownTimer) {
      clearTimeout(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  private resetChatLog(roundId: number): void {
    this.chatLog = [];
    this.chatLogRoundId = roundId;
  }

  private clearChatLog(): void {
    this.chatLog = [];
    this.chatLogRoundId = null;
  }

  private appendChatLog(msg: ParsedPrivmsg): void {
    this.chatLog.push({
      displayName: msg.displayName,
      userId: msg.userId,
      message: msg.message,
      at: new Date().toISOString(),
    });
  }

  private logChatLogBeforeDeadline(roundId: number): void {
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

  private async sendDeadlineIfNeeded(round: Round | null | undefined): Promise<void> {
    if (!round || this.deadlineSentForRoundId === round.id) return;
    this.deadlineSentForRoundId = round.id;
    this.logChatLogBeforeDeadline(round.id);
    const settings = await this.settingsService.getSettings();
    if (!settings.showCutoffChat) return;
    this.sendChatMessage(formatQuestionForChat(round, settings.cutoffChatMessage));
  }

  private scheduleCountdownEnd(round: Round | null | undefined): void {
    this.clearCountdownTimer();
    if (!round || round.status !== 'active' || round.countdownPaused) return;
    if (!round.countdownEndsAt) return;

    const roundId = round.id;
    const delayMs = Math.max(0, new Date(round.countdownEndsAt).getTime() - Date.now());
    this.countdownTimer = setTimeout(() => {
      this.countdownTimer = null;
      void this.roundsService.findOne(roundId).then((active) => {
        if (!active || active.id !== roundId || active.status !== 'active') return;
        if (active.countdownPaused) return;
        void this.sendDeadlineIfNeeded(round);
      });
    }, delayMs);
  }

  private async handleMessage(raw: string): Promise<void> {
    const msg = this.parsePrivmsg(raw);
    if (!msg?.userId || !msg.displayName) return;

    const active = await this.roundsService.findActive();
    if (active && active.id === this.chatLogRoundId) {
      this.appendChatLog(msg);
    }

    const answer = parseAnswer(msg.message);
    if (!answer || !active) return;

    const vote = await this.roundsService.recordVote({
      roundId: active.id,
      twitchUserId: msg.userId,
      displayName: msg.displayName,
      answer: answer as AnswerChoice,
    });

    if (vote) {
      await this.roundEventsService.publishVoteCounts(active.id);
    }
  }

  private parsePrivmsg(raw: string): ParsedPrivmsg | null {
    if (!raw.includes('PRIVMSG')) return null;
    const [tagSection, rest] = raw.split(' PRIVMSG ');
    const info = this.parseIrcTags(tagSection.replace(/^@/, ''));
    const messageStart = rest.indexOf(':');
    const message = messageStart >= 0 ? rest.slice(messageStart + 1).trim() : '';
    return {
      displayName: info['display-name'],
      userId: info['user-id'],
      message,
    };
  }

  private parseIrcTags(tagSection: string): Record<string, string> {
    const info: Record<string, string> = {};
    for (const part of tagSection.split(';')) {
      const eq = part.indexOf('=');
      if (eq === -1) continue;
      info[part.slice(0, eq)] = part.slice(eq + 1);
    }
    return info;
  }
}

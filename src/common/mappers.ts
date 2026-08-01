import {
  AnswerChoice,
  DEFAULT_COUNTDOWN_SECONDS,
  RoundStatus,
} from '../common/constants';
import { Question } from '../entities/question.entity';
import { Round } from '../entities/round.entity';
import { ScoreboardEntry } from '../entities/scoreboard-entry.entity';
import { TwitchConfig } from '../entities/twitch-config.entity';

export interface VoteCounts {
  A: number;
  B: number;
  C: number;
  D: number;
  total: number;
}

export function getCountdownRemainingSeconds(round: Round | null | undefined): number {
  if (!round || round.status !== RoundStatus.active) return 0;
  if (round.countdownPaused) {
    return Math.max(0, Math.ceil((round.countdownRemainingMs ?? 0) / 1000));
  }
  if (!round.countdownEndsAt) {
    return round.countdownSeconds ?? DEFAULT_COUNTDOWN_SECONDS;
  }
  const endMs = new Date(round.countdownEndsAt).getTime();
  return Math.max(0, Math.ceil((endMs - Date.now()) / 1000));
}

export function isRoundAcceptingVotes(round: Round | null | undefined): boolean {
  if (!round || round.status !== RoundStatus.active) return false;
  return getCountdownRemainingSeconds(round) > 0;
}

export function mapQuestionEntity(
  row: Question | null | undefined,
  revealAnswer = true
) {
  if (!row) return null;
  return {
    id: String(row.id),
    text: row.text,
    optionA: row.optionA,
    optionB: row.optionB,
    optionC: row.optionC,
    optionD: row.optionD,
    correctAnswer: revealAnswer ? row.correctAnswer : null,
    countdownSeconds: row.countdownSeconds ?? DEFAULT_COUNTDOWN_SECONDS,
    createdAt: row.createdAt ? String(row.createdAt) : null,
  };
}

export function mapRoundEntity(
  row: Round | null | undefined,
  voteCounts: VoteCounts,
  { revealAnswer = false }: { revealAnswer?: boolean } = {}
) {
  if (!row || !row.question) return null;
  const question = mapQuestionEntity(
    row.question,
    revealAnswer || row.status === RoundStatus.ended
  )!;
  return {
    id: String(row.id),
    questionId: String(row.questionId),
    status: row.status,
    startedAt: String(row.startedAt),
    endedAt: row.endedAt,
    question,
    voteCounts,
    countdownSeconds: row.countdownSeconds ?? DEFAULT_COUNTDOWN_SECONDS,
    countdownRemainingSeconds: getCountdownRemainingSeconds(row),
    countdownPaused: Boolean(row.countdownPaused),
    countdownEndsAt: row.countdownEndsAt ?? null,
  };
}

export function mapTwitchConfigEntity(row: TwitchConfig | null | undefined) {
  if (!row) return null;
  return {
    login: row.login,
    userId: row.userId,
    channel: row.channel,
    updatedAt: String(row.updatedAt),
    hasToken: Boolean(row.accessToken),
  };
}

export function mapScoreboardEntity(row: ScoreboardEntry) {
  return {
    twitchUserId: row.twitchUserId,
    displayName: row.displayName,
    score: row.score,
  };
}

export function emptyVoteCounts(): VoteCounts {
  return { A: 0, B: 0, C: 0, D: 0, total: 0 };
}

export function formatQuestionForChat(round: Round): string {
  const q = round.question;
  return [
    `Q${round.id}: ${q.text}`,
    `A ) ${q.optionA}`,
    `B ) ${q.optionB}`,
    `C ) ${q.optionC}`,
    `D ) ${q.optionD}`,
  ].join('\n');
}

export function parseAnswer(message: string): AnswerChoice | null {
  const trimmed = message.trim();
  const match = trimmed.match(/^!?([ABCD])$/i);
  return match ? (match[1].toUpperCase() as AnswerChoice) : null;
}

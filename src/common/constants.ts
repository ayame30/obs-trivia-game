export enum AnswerChoice {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
}

export enum RoundStatus {
  active = 'active',
  ended = 'ended',
}

export const DEFAULT_COUNTDOWN_SECONDS = 30;
export const MIN_COUNTDOWN_SECONDS = 5;
export const MAX_COUNTDOWN_SECONDS = 600;

export function clampCountdownSeconds(value: unknown): number {
  const seconds = Number(value);
  if (!Number.isFinite(seconds)) return DEFAULT_COUNTDOWN_SECONDS;
  return Math.min(MAX_COUNTDOWN_SECONDS, Math.max(MIN_COUNTDOWN_SECONDS, Math.round(seconds)));
}

export const PUB_SUB = 'PUB_SUB';

export const TOPICS = {
  QUESTION_STARTED: 'QUESTION_STARTED',
  VOTE_COUNTS_UPDATED: 'VOTE_COUNTS_UPDATED',
  COUNTDOWN_UPDATED: 'COUNTDOWN_UPDATED',
  QUESTION_ENDED: 'QUESTION_ENDED',
  SCOREBOARD_UPDATED: 'SCOREBOARD_UPDATED',
  ROUNDS_RESET: 'ROUNDS_RESET',
} as const;

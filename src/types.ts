export type AnswerChoice = 'A' | 'B' | 'C' | 'D';
export type RoundStatus = 'active' | 'ended';

export interface QuestionRow {
  id: number;
  text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: AnswerChoice;
  countdown_seconds: number;
  created_at: string;
}

export interface RoundRow {
  id: number;
  question_id: number;
  status: RoundStatus;
  started_at: string;
  ended_at: string | null;
  countdown_seconds: number;
  countdown_ends_at: string | null;
  countdown_paused: number;
  countdown_remaining_ms: number | null;
  text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: AnswerChoice;
  question_countdown_seconds?: number;
}

export interface TwitchConfigRow {
  id: number;
  access_token: string;
  login: string;
  user_id: string;
  channel: string;
  updated_at: string;
}

export interface ScoreboardRow {
  twitch_user_id: string;
  display_name: string;
  score: number;
  updated_at: string;
}

export interface VoteCounts {
  A: number;
  B: number;
  C: number;
  D: number;
  total: number;
}

export interface Question {
  id: string;
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: AnswerChoice | null;
  countdownSeconds: number;
  createdAt: string | null;
}

export interface Round {
  id: string;
  questionId: string;
  status: RoundStatus;
  startedAt: string;
  endedAt: string | null;
  question: Question;
  voteCounts: VoteCounts;
  countdownSeconds: number;
  countdownRemainingSeconds: number;
  countdownPaused: boolean;
  countdownEndsAt: string | null;
}

export interface TwitchConfig {
  login: string;
  userId: string;
  channel: string;
  updatedAt: string;
  hasToken: boolean;
}

export interface ScoreboardEntry {
  twitchUserId: string;
  displayName: string;
  score: number;
}

export interface CreateQuestionInput {
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: AnswerChoice;
  countdownSeconds?: number | null;
}

export interface UpdateQuestionInput {
  text?: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctAnswer?: AnswerChoice;
  countdownSeconds?: number | null;
}

export interface ScoreboardUpdateInput {
  twitchUserId: string;
  displayName?: string;
  score?: number;
  delta?: number;
}

export interface RecordVoteResult {
  roundId: number;
  twitchUserId: string;
  displayName: string;
  answer: AnswerChoice;
  isNew: boolean;
}

export interface TwitchUser {
  login: string;
  user_id: string;
}

export interface ChatLogEntry {
  displayName: string;
  userId: string;
  message: string;
  at: string;
}

export interface ParsedPrivmsg {
  displayName: string;
  userId: string;
  message: string;
}

export const TOPICS = {
  QUESTION_STARTED: 'QUESTION_STARTED',
  VOTE_COUNTS_UPDATED: 'VOTE_COUNTS_UPDATED',
  COUNTDOWN_UPDATED: 'COUNTDOWN_UPDATED',
  QUESTION_ENDED: 'QUESTION_ENDED',
  SCOREBOARD_UPDATED: 'SCOREBOARD_UPDATED',
  ROUNDS_RESET: 'ROUNDS_RESET',
} as const;

export type Topic = (typeof TOPICS)[keyof typeof TOPICS];

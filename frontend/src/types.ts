import type { Dispatch, SetStateAction } from 'react';

export type AnswerChoice = 'A' | 'B' | 'C' | 'D';
export type RoundStatus = 'active' | 'ended';

export interface Question {
  id: string;
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: AnswerChoice | null;
  countdownSeconds: number;
  createdAt?: string | null;
}

export interface VoteCounts {
  A: number;
  B: number;
  C: number;
  D: number;
  total: number;
}

export interface Round {
  id: string;
  questionId: string;
  status: RoundStatus;
  startedAt: string;
  endedAt?: string | null;
  question: Question;
  voteCounts: VoteCounts;
  countdownSeconds: number;
  countdownRemainingSeconds: number;
  countdownPaused: boolean;
  countdownEndsAt?: string | null;
}

export interface ScoreboardEntry {
  twitchUserId: string;
  displayName: string;
  score: number;
}

export interface TwitchConfig {
  login: string;
  userId: string;
  channel: string;
  updatedAt: string;
  hasToken: boolean;
  chatConnected: boolean;
}

export interface TwitchStoredAuth {
  accessToken: string;
  login: string;
  userId: string;
}

export interface QuestionFormState {
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: AnswerChoice;
  countdownSeconds: number | string;
}

export interface TriviaLiveContextValue {
  round: Round | null;
  setRound: Dispatch<SetStateAction<Round | null>>;
  scoreboard: ScoreboardEntry[];
  setScoreboard: Dispatch<SetStateAction<ScoreboardEntry[]>>;
  loading: boolean;
  subError: string | null;
  refresh: () => void;
}

export interface GetQuestionsData {
  questions: Question[];
}

export interface GetActiveRoundData {
  activeRound: Round | null;
}

export interface GetScoreboardData {
  scoreboard: ScoreboardEntry[];
}

export interface GetTwitchConfigData {
  twitchConfig: TwitchConfig | null;
}

export interface QuestionStartedData {
  questionStarted: Round;
}

export interface VoteCountsUpdatedData {
  voteCountsUpdated: VoteCounts;
}

export interface CountdownUpdatedData {
  countdownUpdated: Round;
}

export interface QuestionEndedData {
  questionEnded: Round;
}

export interface ScoreboardUpdatedData {
  scoreboardUpdated: ScoreboardEntry[];
}

export interface RoundsResetData {
  roundsReset: boolean;
}

export interface StartQuestionMutation {
  startQuestion: Round;
}

export interface StopQuestionMutation {
  stopQuestion: Round;
}

export interface PauseCountdownMutation {
  pauseCountdown: Round;
}

export interface ResumeCountdownMutation {
  resumeCountdown: Round;
}

export interface ResetScoreboardMutation {
  resetScoreboard: ScoreboardEntry[];
}

export interface UpdateScoreboardMutation {
  updateScoreboard: ScoreboardEntry[];
}

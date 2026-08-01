import {
  getQuestions,
  getQuestion,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getTwitchConfig,
  setTwitchConfig,
  getActiveRound,
  startRound,
  stopRound,
  pauseCountdown,
  resumeCountdown,
  getScoreboard,
  resetScoreboard,
  batchUpdateScoreboard,
  resetRounds,
  mapQuestion,
  mapRound,
  mapTwitchConfig,
  mapScoreboardEntry,
  getVoteCounts,
} from './db.js';
import { pubsub, TOPICS } from './pubsub.js';
import { validateTwitchToken } from './twitch/oauth.js';
import {
  chatMonitor,
  publishScoreboard,
  publishQuestionStarted,
  publishQuestionEnded,
  publishCountdownUpdated,
} from './twitch/chatMonitor.js';
import type { Round, ScoreboardUpdateInput } from './types.js';

export const resolvers = {
  Query: {
    questions: () => getQuestions().map(mapQuestion).filter(Boolean),
    question: (_: unknown, { id }: { id: string }) => mapQuestion(getQuestion(id)),
    activeRound: () => {
      const row = getActiveRound();
      return row ? mapRound(row) : null;
    },
    twitchConfig: () => mapTwitchConfig(getTwitchConfig()),
    scoreboard: () => getScoreboard().map(mapScoreboardEntry),
  },

  Mutation: {
    createQuestion: (_: unknown, { input }: { input: Parameters<typeof createQuestion>[0] }) => {
      const q = createQuestion(input);
      return mapQuestion(q);
    },
    updateQuestion: (
      _: unknown,
      { id, input }: { id: string; input: Parameters<typeof updateQuestion>[1] }
    ) => mapQuestion(updateQuestion(Number(id), input)),
    deleteQuestion: (_: unknown, { id }: { id: string }) => deleteQuestion(Number(id)),
    setTwitchToken: async (
      _: unknown,
      { accessToken, channel }: { accessToken: string; channel?: string }
    ) => {
      const user = await validateTwitchToken(accessToken);
      const login = user.login;
      const row = setTwitchConfig({
        accessToken,
        login,
        userId: String(user.user_id),
        channel: (channel || login).replace(/^#/, '').toLowerCase(),
      });
      await chatMonitor.connect();
      return mapTwitchConfig(row);
    },
    startQuestion: (_: unknown, { questionId }: { questionId: string }) => {
      const row = startRound(Number(questionId));
      if (!row) throw new Error('Failed to start round');
      return publishQuestionStarted(row);
    },
    stopQuestion: async () => {
      const active = getActiveRound();
      if (!active) {
        throw new Error('No active question round');
      }
      const row = stopRound(active.id);
      if (!row) throw new Error('Failed to stop round');
      const round = publishQuestionEnded(row);
      await publishScoreboard();
      return round;
    },
    pauseCountdown: () => {
      const active = getActiveRound();
      if (!active) {
        throw new Error('No active question round');
      }
      const row = pauseCountdown(active.id);
      if (!row) throw new Error('Failed to pause countdown');
      return publishCountdownUpdated(row);
    },
    resumeCountdown: () => {
      const active = getActiveRound();
      if (!active) {
        throw new Error('No active question round');
      }
      const row = resumeCountdown(active.id);
      if (!row) throw new Error('Failed to resume countdown');
      return publishCountdownUpdated(row);
    },
    resetScoreboard: async () => {
      resetScoreboard();
      return publishScoreboard();
    },
    updateScoreboard: async (_: unknown, { updates }: { updates: ScoreboardUpdateInput[] }) => {
      batchUpdateScoreboard(updates);
      return publishScoreboard();
    },
    resetRounds: () => {
      resetRounds();
      pubsub.publish(TOPICS.ROUNDS_RESET, { roundsReset: true });
      return true;
    },
    reconnectTwitchChat: async () => {
      return chatMonitor.connect();
    },
  },

  Subscription: {
    questionStarted: {
      subscribe: () => pubsub.asyncIterableIterator([TOPICS.QUESTION_STARTED]),
    },
    voteCountsUpdated: {
      subscribe: () => pubsub.asyncIterableIterator([TOPICS.VOTE_COUNTS_UPDATED]),
    },
    countdownUpdated: {
      subscribe: () => pubsub.asyncIterableIterator([TOPICS.COUNTDOWN_UPDATED]),
    },
    questionEnded: {
      subscribe: () => pubsub.asyncIterableIterator([TOPICS.QUESTION_ENDED]),
    },
    scoreboardUpdated: {
      subscribe: () => pubsub.asyncIterableIterator([TOPICS.SCOREBOARD_UPDATED]),
    },
    roundsReset: {
      subscribe: () => pubsub.asyncIterableIterator([TOPICS.ROUNDS_RESET]),
    },
  },

  Round: {
    voteCounts: (round: Round) => getVoteCounts(Number(round.id)),
    countdownRemainingSeconds: (round: Round) => {
      if (round.status !== 'active') return 0;
      if (round.countdownPaused) {
        return round.countdownRemainingSeconds ?? 0;
      }
      if (round.countdownEndsAt) {
        return Math.max(
          0,
          Math.ceil((new Date(round.countdownEndsAt).getTime() - Date.now()) / 1000)
        );
      }
      return round.countdownRemainingSeconds ?? round.countdownSeconds ?? 0;
    },
  },
};

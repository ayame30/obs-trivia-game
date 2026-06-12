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

export const resolvers = {
  Query: {
    questions: () => getQuestions().map(mapQuestion),
    question: (_, { id }) => mapQuestion(getQuestion(id)),
    activeRound: () => {
      const row = getActiveRound();
      return row ? mapRound(row) : null;
    },
    twitchConfig: () => mapTwitchConfig(getTwitchConfig()),
    scoreboard: () => getScoreboard().map(mapScoreboardEntry),
  },

  Mutation: {
    createQuestion: (_, { input }) => {
      const q = createQuestion(input);
      return mapQuestion(q);
    },
    updateQuestion: (_, { id, input }) => mapQuestion(updateQuestion(Number(id), input)),
    deleteQuestion: (_, { id }) => deleteQuestion(Number(id)),
    setTwitchToken: async (_, { accessToken, channel }) => {
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
    startQuestion: (_, { questionId }) => {
      const row = startRound(Number(questionId));
      const round = publishQuestionStarted(row);
      return round;
    },
    stopQuestion: async () => {
      const active = getActiveRound();
      if (!active) {
        throw new Error('No active question round');
      }
      const row = stopRound(active.id);
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
      return publishCountdownUpdated(row);
    },
    resumeCountdown: () => {
      const active = getActiveRound();
      if (!active) {
        throw new Error('No active question round');
      }
      const row = resumeCountdown(active.id);
      return publishCountdownUpdated(row);
    },
    resetScoreboard: async () => {
      resetScoreboard();
      return publishScoreboard();
    },
    updateScoreboard: async (_, { updates }) => {
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
    voteCounts: (round) => getVoteCounts(Number(round.id)),
    countdownRemainingSeconds: (round) => {
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

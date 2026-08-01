import { PubSub } from 'graphql-subscriptions';
import type { VoteCounts, Round, ScoreboardEntry } from './types.js';
import { TOPICS } from './types.js';

export { TOPICS };

export interface PubSubPayloads {
  [TOPICS.QUESTION_STARTED]: { questionStarted: Round };
  [TOPICS.VOTE_COUNTS_UPDATED]: { voteCountsUpdated: VoteCounts };
  [TOPICS.COUNTDOWN_UPDATED]: { countdownUpdated: Round };
  [TOPICS.QUESTION_ENDED]: { questionEnded: Round };
  [TOPICS.SCOREBOARD_UPDATED]: { scoreboardUpdated: ScoreboardEntry[] };
  [TOPICS.ROUNDS_RESET]: { roundsReset: boolean };
}

export const pubsub = new PubSub();

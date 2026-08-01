import { Inject, Injectable } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { PUB_SUB, TOPICS } from '../common/constants';
import { Round } from '../entities/round.entity';
import { RoundsService } from '../rounds/rounds.service';
import { ScoreboardService } from '../scoreboard/scoreboard.service';

@Injectable()
export class RoundEventsService {
  constructor(
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
    private readonly roundsService: RoundsService,
    private readonly scoreboardService: ScoreboardService
  ) {}

  async publishQuestionStarted(round: Round) {
    const mapped = await this.roundsService.mapRound(round);
    if (!mapped) throw new Error('Failed to map round');
    await this.pubSub.publish(TOPICS.QUESTION_STARTED, { questionStarted: mapped });
    return mapped;
  }

  async publishQuestionEnded(round: Round) {
    const mapped = await this.roundsService.mapRound(round, true);
    if (!mapped) throw new Error('Failed to map round');
    await this.pubSub.publish(TOPICS.QUESTION_ENDED, { questionEnded: mapped });
    return mapped;
  }

  async publishCountdownUpdated(round: Round) {
    const mapped = await this.roundsService.mapRound(round);
    if (!mapped) throw new Error('Failed to map round');
    await this.pubSub.publish(TOPICS.COUNTDOWN_UPDATED, { countdownUpdated: mapped });
    return mapped;
  }

  async publishVoteCounts(roundId: number) {
    const counts = await this.roundsService.getVoteCounts(roundId);
    await this.pubSub.publish(TOPICS.VOTE_COUNTS_UPDATED, { voteCountsUpdated: counts });
  }

  async publishScoreboard() {
    const entries = await this.scoreboardService.findAll();
    await this.pubSub.publish(TOPICS.SCOREBOARD_UPDATED, { scoreboardUpdated: entries });
    return entries;
  }

  async publishRoundsReset() {
    await this.pubSub.publish(TOPICS.ROUNDS_RESET, { roundsReset: true });
  }
}

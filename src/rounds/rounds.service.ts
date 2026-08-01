import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnswerChoice, RoundStatus } from '../common/constants';
import {
  emptyVoteCounts,
  isRoundAcceptingVotes,
  mapRoundEntity,
  VoteCounts,
} from '../common/mappers';
import { Round } from '../entities/round.entity';
import { Vote } from '../entities/vote.entity';
import { QuestionsService } from '../questions/questions.service';
import { ScoreboardService } from '../scoreboard/scoreboard.service';
import {
  clampCountdownSeconds,
  DEFAULT_COUNTDOWN_SECONDS,
} from '../common/constants';

@Injectable()
export class RoundsService {
  constructor(
    @InjectRepository(Round)
    private readonly roundRepo: Repository<Round>,
    @InjectRepository(Vote)
    private readonly voteRepo: Repository<Vote>,
    private readonly questionsService: QuestionsService,
    private readonly scoreboardService: ScoreboardService
  ) {}

  async findActive(): Promise<Round | null> {
    return this.roundRepo.findOne({
      where: { status: RoundStatus.active },
      relations: ['question'],
      order: { id: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Round | null> {
    return this.roundRepo.findOne({
      where: { id },
      relations: ['question'],
    });
  }

  async getVoteCounts(roundId: number): Promise<VoteCounts> {
    const rows = await this.voteRepo
      .createQueryBuilder('vote')
      .select('vote.answer', 'answer')
      .addSelect('COUNT(*)', 'count')
      .where('vote.round_id = :roundId', { roundId })
      .groupBy('vote.answer')
      .getRawMany<{ answer: AnswerChoice; count: string }>();

    const counts = emptyVoteCounts();
    for (const row of rows) {
      counts[row.answer] = Number(row.count);
      counts.total += Number(row.count);
    }
    return counts;
  }

  async mapRound(round: Round | null, revealAnswer = false) {
    if (!round) return null;
    const voteCounts = await this.getVoteCounts(round.id);
    return mapRoundEntity(round, voteCounts, { revealAnswer });
  }

  async startRound(questionId: number): Promise<Round> {
    const existing = await this.findActive();
    if (existing) {
      throw new Error('A question round is already active. Stop it before starting another.');
    }

    const question = await this.questionsService.findEntity(questionId);
    if (!question) {
      throw new Error('Question not found');
    }

    const seconds = clampCountdownSeconds(question.countdownSeconds);
    const endsAt = new Date(Date.now() + seconds * 1000).toISOString();

    const entity = this.roundRepo.create({
      questionId,
      status: RoundStatus.active,
      countdownSeconds: seconds,
      countdownEndsAt: endsAt,
      countdownPaused: 0,
      countdownRemainingMs: null,
    });

    const saved = await this.roundRepo.save(entity);
    const loaded = await this.findOne(saved.id);
    if (!loaded) throw new Error('Failed to start round');
    return loaded;
  }

  async pauseCountdown(roundId: number): Promise<Round> {
    const round = await this.findOne(roundId);
    if (!round || round.status !== RoundStatus.active) {
      throw new Error('No active round to pause');
    }
    if (round.countdownPaused) return round;

    const remainingMs = Math.max(
      0,
      new Date(round.countdownEndsAt!).getTime() - Date.now()
    );
    round.countdownPaused = 1;
    round.countdownRemainingMs = remainingMs;
    round.countdownEndsAt = null;
    await this.roundRepo.save(round);
    const loaded = await this.findOne(roundId);
    if (!loaded) throw new Error('Failed to pause countdown');
    return loaded;
  }

  async resumeCountdown(roundId: number): Promise<Round> {
    const round = await this.findOne(roundId);
    if (!round || round.status !== RoundStatus.active) {
      throw new Error('No active round to resume');
    }
    if (!round.countdownPaused) return round;

    const remainingMs = Math.max(0, round.countdownRemainingMs ?? 0);
    round.countdownPaused = 0;
    round.countdownRemainingMs = null;
    round.countdownEndsAt = new Date(Date.now() + remainingMs).toISOString();
    await this.roundRepo.save(round);
    const loaded = await this.findOne(roundId);
    if (!loaded) throw new Error('Failed to resume countdown');
    return loaded;
  }

  async stopRound(roundId: number): Promise<Round> {
    const round = await this.findOne(roundId);
    if (!round || round.status !== RoundStatus.active) {
      throw new Error('No active round to stop');
    }

    round.status = RoundStatus.ended;
    round.endedAt = new Date().toISOString();
    await this.roundRepo.save(round);

    const voters = await this.voteRepo.find({
      where: { roundId, answer: round.question.correctAnswer },
    });

    for (const vote of voters) {
      await this.scoreboardService.incrementScore(vote.twitchUserId, vote.displayName);
    }

    const loaded = await this.findOne(roundId);
    if (!loaded) throw new Error('Failed to stop round');
    return loaded;
  }

  async recordVote(params: {
    roundId: number;
    twitchUserId: string;
    displayName: string;
    answer: AnswerChoice;
  }) {
    const round = await this.findOne(params.roundId);
    if (!round || round.status !== RoundStatus.active || !isRoundAcceptingVotes(round)) {
      return null;
    }

    try {
      const vote = this.voteRepo.create(params);
      await this.voteRepo.save(vote);
      return { ...params, isNew: true };
    } catch {
      return null;
    }
  }

  async resetRounds(): Promise<boolean> {
    await this.voteRepo.clear();
    await this.roundRepo.clear();
    await this.roundRepo.query("DELETE FROM sqlite_sequence WHERE name = 'rounds'");
    return true;
  }
}

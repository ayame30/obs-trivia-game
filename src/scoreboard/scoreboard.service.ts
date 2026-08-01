import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { mapScoreboardEntity } from '../common/mappers';
import { ScoreboardEntry } from '../entities/scoreboard-entry.entity';

export interface ScoreboardUpdateInput {
  twitchUserId: string;
  displayName?: string;
  score?: number;
  delta?: number;
}

@Injectable()
export class ScoreboardService {
  constructor(
    @InjectRepository(ScoreboardEntry)
    private readonly scoreboardRepo: Repository<ScoreboardEntry>
  ) {}

  async findAll() {
    const rows = await this.scoreboardRepo.find({
      order: { score: 'DESC', displayName: 'ASC' },
    });
    return rows.map(mapScoreboardEntity);
  }

  async findEntities() {
    return this.scoreboardRepo.find({
      order: { score: 'DESC', displayName: 'ASC' },
    });
  }

  async reset() {
    await this.scoreboardRepo.clear();
    return [];
  }

  async incrementScore(twitchUserId: string, displayName: string) {
    const existing = await this.scoreboardRepo.findOne({ where: { twitchUserId } });
    if (existing) {
      existing.score += 1;
      existing.displayName = displayName;
      await this.scoreboardRepo.save(existing);
      return existing;
    }

    const entry = this.scoreboardRepo.create({
      twitchUserId,
      displayName,
      score: 1,
    });
    return this.scoreboardRepo.save(entry);
  }

  async batchUpdate(updates: ScoreboardUpdateInput[]) {
    if (!updates?.length) {
      return this.findAll();
    }

    return this.scoreboardRepo.manager.transaction(async (manager) => {
      const repo = manager.getRepository(ScoreboardEntry);

      for (const item of updates) {
        const { twitchUserId, displayName, score, delta } = item;
        const hasScore = score !== undefined && score !== null;
        const hasDelta = delta !== undefined && delta !== null;

        if (hasScore === hasDelta) {
          throw new Error(
            `Each update must include exactly one of score or delta (${twitchUserId})`
          );
        }

        const existing = await repo.findOne({ where: { twitchUserId } });
        if (!existing) {
          throw new Error(`Scoreboard entry not found (${twitchUserId})`);
        }

        if (hasScore) {
          existing.score = Math.max(0, Math.round(score!));
        } else {
          existing.score = Math.max(0, existing.score + Math.round(delta!));
        }
        if (displayName) {
          existing.displayName = displayName;
        }
        await repo.save(existing);
      }

      const rows = await repo.find({ order: { score: 'DESC', displayName: 'ASC' } });
      return rows.map(mapScoreboardEntity);
    });
  }
}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScoreboardEntry } from '../entities/scoreboard-entry.entity';
import { ScoreboardService } from './scoreboard.service';

@Module({
  imports: [TypeOrmModule.forFeature([ScoreboardEntry])],
  providers: [ScoreboardService],
  exports: [ScoreboardService],
})
export class ScoreboardModule {}

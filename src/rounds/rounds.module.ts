import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Round } from '../entities/round.entity';
import { Vote } from '../entities/vote.entity';
import { QuestionsModule } from '../questions/questions.module';
import { ScoreboardModule } from '../scoreboard/scoreboard.module';
import { RoundEventsService } from './round-events.service';
import { RoundsService } from './rounds.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Round, Vote]),
    QuestionsModule,
    ScoreboardModule,
  ],
  providers: [RoundsService, RoundEventsService],
  exports: [RoundsService, RoundEventsService],
})
export class RoundsModule {}

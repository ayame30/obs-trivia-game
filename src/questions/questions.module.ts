import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Question } from '../entities/question.entity';
import { Round } from '../entities/round.entity';
import { QuestionsService } from './questions.service';

@Module({
  imports: [TypeOrmModule.forFeature([Question, Round])],
  providers: [QuestionsService],
  exports: [QuestionsService],
})
export class QuestionsModule {}

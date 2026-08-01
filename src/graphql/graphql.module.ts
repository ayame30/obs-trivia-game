import { Module } from '@nestjs/common';
import { TriviaResolver } from './trivia.resolver';
import { QuestionsModule } from '../questions/questions.module';
import { RoundsModule } from '../rounds/rounds.module';
import { ScoreboardModule } from '../scoreboard/scoreboard.module';
import { TwitchModule } from '../twitch/twitch.module';

@Module({
  imports: [QuestionsModule, RoundsModule, ScoreboardModule, TwitchModule],
  providers: [TriviaResolver],
})
export class GraphqlModule {}

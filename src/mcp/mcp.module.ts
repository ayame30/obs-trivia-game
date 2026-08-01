import { Module } from '@nestjs/common';
import { QuestionsModule } from '../questions/questions.module';
import { SettingsModule } from '../settings/settings.module';
import { McpController } from './mcp.controller';
import { TriviaMcpService } from './trivia-mcp.service';

@Module({
  imports: [SettingsModule, QuestionsModule],
  controllers: [McpController],
  providers: [TriviaMcpService],
})
export class McpModule {}

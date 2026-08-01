import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TwitchConfig } from '../entities/twitch-config.entity';
import { RoundsModule } from '../rounds/rounds.module';
import { TwitchChatMonitorService } from './twitch-chat-monitor.service';
import { TwitchConfigService } from './twitch-config.service';
import { TwitchOAuthService } from './twitch-oauth.service';

@Module({
  imports: [TypeOrmModule.forFeature([TwitchConfig]), forwardRef(() => RoundsModule)],
  providers: [TwitchConfigService, TwitchOAuthService, TwitchChatMonitorService],
  exports: [TwitchConfigService, TwitchOAuthService, TwitchChatMonitorService],
})
export class TwitchModule {}

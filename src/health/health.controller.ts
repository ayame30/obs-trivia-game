import { Controller, Get } from '@nestjs/common';
import { TwitchChatMonitorService } from '../twitch/twitch-chat-monitor.service';

@Controller('health')
export class HealthController {
  constructor(private readonly chatMonitor: TwitchChatMonitorService) {}

  @Get()
  health() {
    return {
      ok: true,
      twitchChat: this.chatMonitor.isConnected(),
    };
  }
}

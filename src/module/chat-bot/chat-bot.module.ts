import { Module } from '@nestjs/common';
import { ChatBotService } from './chat-bot.service';
import { ChatBotController } from './chat-bot.controller';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    CacheModule.register({
      max: 100,
      ttl: 0,
    }),
  ],
  controllers: [ChatBotController],
  providers: [ChatBotService],
})
export class ChatBotModule {}

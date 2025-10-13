import { Module } from '@nestjs/common';
import { ChatBotService } from './chat-bot.service';
import { ChatBotController } from './chat-bot.controller';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  controllers: [ChatBotController],
  providers: [ChatBotService],
})
export class ChatBotModule {}

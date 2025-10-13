import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ChatBotService } from './chat-bot.service';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('chat-bot')
export class ChatBotController {
  constructor(private readonly chatbotService: ChatBotService) {}

  @Post('send')
  async sendMessage(@Body() body: { userId: string; message: string }) {
    await this.chatbotService.saveMessage(body.userId, body.message);
    return { status: 'saved' };
  }

  @Get('history')
  async getHistory(@Query('userId') userId: string) {
    const messages = await this.chatbotService.getMessages(userId);
    return { userId, messages };
  }
}

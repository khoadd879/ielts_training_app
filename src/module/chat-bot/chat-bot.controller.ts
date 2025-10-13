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
import { ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('chat-bot')
export class ChatBotController {
  constructor(private readonly chatbotService: ChatBotService) {}

  @Post('send')
  @ApiBody({
    schema: {
      properties: {
        idUser: { type: 'string' },
        message: { type: 'string' },
      },
    },
  })
  async sendMessage(@Body() body: { idUser: string; message: string }) {
    const reply = await this.chatbotService.handleUserMessage(
      body.idUser,
      body.message,
    );
    return { reply };
  }

  @Get('history')
  async getHistory(@Query('userId') userId: string) {
    const messages = await this.chatbotService.getMessages(userId);
    return { userId, messages };
  }

  @Delete('clear')
  async clearHistory(@Query('userId') userId: string) {
    await this.chatbotService.clearMessages(userId);
    return { status: 'cleared' };
  }
}

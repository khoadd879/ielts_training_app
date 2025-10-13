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

@ApiBearerAuth()
@Controller('chat-bot')
export class ChatBotController {
  constructor(private readonly chatbotService: ChatBotService) {}

  @Post('send')
  @ApiBody({ type: SendMessageDto })
  async sendMessage(@Body() body: SendMessageDto) {
    await this.chatbotService.saveMessage(body.idUser, body.message);
    return { status: 'saved' };
  }

  @Get('history')
  async getHistory(@Query('userId') userId: string) {
    const messages = await this.chatbotService.getMessages(userId);
    return { userId, messages };
  }
}

import { PartialType } from '@nestjs/swagger';
import { CreateChatBotDto } from './create-chat-bot.dto';

export class UpdateChatBotDto extends PartialType(CreateChatBotDto) {}

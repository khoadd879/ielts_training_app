import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({
    example: 'user123',
    description: 'ID của người dùng đang chat với bot',
  })
  idUser: string;

  @ApiProperty({
    example: 'Hello, I need help with my IELTS speaking test.',
    description: 'Tin nhắn người dùng gửi tới chatbot',
  })
  message: string;
}

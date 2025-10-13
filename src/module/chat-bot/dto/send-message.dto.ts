import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ example: 'user123' })
  @IsString()
  @IsNotEmpty()
  idUser: string;

  @ApiProperty({ example: 'Hello bot' })
  @IsString()
  @IsNotEmpty()
  message: string;
}

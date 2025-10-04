import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class CreateForumPostDto {
  @IsNotEmpty()
  @ApiProperty({ example: '123' })
  idForumThreads: string;

  @IsNotEmpty()
  @ApiProperty({ example: '123' })
  idUser: string;

  @IsNotEmpty()
  @ApiProperty({ example: 'content' })
  content: string;
}

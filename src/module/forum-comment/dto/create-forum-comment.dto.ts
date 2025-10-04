import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class CreateForumCommentDto {
  @IsNotEmpty()
  @ApiProperty({ example: '123' })
  idForumPost: string;

  @IsNotEmpty()
  @ApiProperty({ example: '123' })
  idUser: string;

  @IsNotEmpty()
  @ApiProperty({ example: 'content' })
  content: string;
}

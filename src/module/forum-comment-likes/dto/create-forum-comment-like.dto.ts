import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class CreateForumCommentLikeDto {
  @IsNotEmpty()
  @ApiProperty({ example: '123' })
  idForumComment: string;

  @IsNotEmpty()
  @ApiProperty({ example: '123' })
  idUser: string;
}

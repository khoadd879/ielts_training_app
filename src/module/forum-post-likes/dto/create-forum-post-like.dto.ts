import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class CreateForumPostLikeDto {
  @IsNotEmpty()
  @ApiProperty({ example: '123' })
  idForumPost: string;

  @IsNotEmpty()
  @ApiProperty({ example: '123' })
  idUser: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class CreateForumThreadDto {
  @IsNotEmpty()
  @ApiProperty({ example: '123' })
  idUser: string;

  @IsNotEmpty()
  @ApiProperty({ example: 'title' })
  title: string;

  @IsNotEmpty()
  @ApiProperty({ example: 'content' })
  content: string;
}

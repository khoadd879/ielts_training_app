import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class CreateForumCategoryDto {
  @IsNotEmpty()
  @ApiProperty({ example: 'name' })
  nameForum: string;

  @ApiProperty({ example: 'description' })
  desciption?: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateForumCategoryDto {
  @IsNotEmpty()
  @ApiProperty({ example: 'name' })
  nameForum: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'description', required: false })
  description?: string;
}

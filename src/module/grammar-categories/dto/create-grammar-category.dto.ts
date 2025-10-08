// Cài đặt nếu bạn chưa có: npm install class-validator class-transformer
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateGrammarCategoryDto {
  @IsNotEmpty()
  @ApiProperty({ example: 'Present simple' })
  name: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ example: 'description' })
  description?: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator';

export class CreatePartDto {
  @ApiProperty({ example: '123' })
  @IsNotEmpty({ message: 'idTest must not be empty' })
  idTest: string;

  @ApiProperty({ example: 'Part 1' })
  @IsNotEmpty({ message: 'name part must not be empty' })
  namePart: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  @ApiProperty({ example: 0, required: false })
  order?: number;

  @IsOptional()
  @ApiProperty({ example: 'https://example.com/audio.mp3', required: false })
  audioUrl?: string;
}

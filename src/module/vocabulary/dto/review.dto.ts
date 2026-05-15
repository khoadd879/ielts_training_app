import { IsInt, IsOptional, IsString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitReviewDto {
  @ApiProperty({ description: 'Vocabulary ID' })
  @IsString()
  idVocab: string;

  @ApiProperty({ description: 'User ID' })
  @IsString()
  idUser: string;

  @ApiProperty({ description: 'Quality of recall: 0-5 (0=wrong, 5=perfect)', minimum: 0, maximum: 5 })
  @IsInt()
  @Min(0)
  @Max(5)
  quality: number;
}

export class GetDueReviewDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  idUser: string;

  @ApiPropertyOptional({ description: 'Limit number of results' })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}

export class GetTierRecommendationDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  idUser: string;
}
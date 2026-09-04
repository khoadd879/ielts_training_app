import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VocabAnswerDto {
  @ApiProperty({ description: 'Vocabulary ID' })
  @IsString()
  vocabId: string;

  @ApiProperty({ description: 'Whether the answer was correct' })
  @IsBoolean()
  isCorrect: boolean;
}

export class CompleteDailyVocabDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  idUser: string;

  @ApiProperty({
    description: 'Array of answers for each vocabulary',
    type: [VocabAnswerDto],
  })
  @IsArray()
  answers: VocabAnswerDto[];
}

export class GetDailyVocabDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  idUser: string;

  @ApiPropertyOptional({
    description: 'Number of words to return (default 10)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}

export class VocabDailyResponseDto {
  @ApiProperty({ description: 'Vocabulary ID' })
  idVocab: string;

  @ApiProperty({ description: 'The word' })
  word: string;

  @ApiProperty({ description: 'Phonetic pronunciation', nullable: true })
  phonetic: string | null;

  @ApiProperty({ description: 'Meaning/definition' })
  meaning: string;

  @ApiProperty({ description: 'Vocabulary type' })
  VocabType: string;
}

export class VocabStatsResponseDto {
  @ApiProperty({ description: 'Tier 1 progress' })
  tier1Progress: { mastered: number; total: number; percentage: number };

  @ApiProperty({ description: 'Tier 2 progress' })
  tier2Progress: { mastered: number; total: number; percentage: number };
}

import { ApiProperty } from '@nestjs/swagger';
import { QuestionType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  Min,
} from 'class-validator';

export class CreateQuestionDto {
  @IsNotEmpty()
  @ApiProperty({ example: '123' })
  idQuestionGroup: string;

  @IsNotEmpty()
  @ApiProperty({ example: '123' })
  idPart: string;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @ApiProperty({ example: 1 })
  questionNumber: number;

  @IsNotEmpty()
  @ApiProperty({ example: 'What is the main idea of paragraph A?' })
  content: string;

  @IsNotEmpty()
  @IsEnum(QuestionType)
  @ApiProperty({ enum: QuestionType, example: 'MULTIPLE_CHOICE' })
  questionType: QuestionType;

  @IsNotEmpty()
  @IsObject()
  @ApiProperty({
    example: {
      type: 'MULTIPLE_CHOICE',
      options: [
        { label: 'A', text: 'Option A' },
        { label: 'B', text: 'Option B' },
        { label: 'C', text: 'Option C' },
        { label: 'D', text: 'Option D' },
      ],
      correctOptionIndexes: [0],
      isMultiSelect: false,
    },
    description: 'Type-specific metadata (see QuestionMetadata union type)',
  })
  metadata: Record<string, any>;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  @ApiProperty({ example: 0, required: false })
  order?: number;
}

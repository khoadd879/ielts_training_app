import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateQuestionDto } from './create-question.dto';
import {
  IsOptional,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  Min,
} from 'class-validator';
import { QuestionType } from '@prisma/client';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateQuestionDto extends PartialType(CreateQuestionDto) {
  @IsOptional()
  @IsNotEmpty()
  @ApiProperty({ example: '123' })
  idQuestionGroup?: string;

  @IsOptional()
  @IsNotEmpty()
  @ApiProperty({ example: '123' })
  idPart?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @ApiProperty({ example: 1 })
  questionNumber?: number;

  @IsOptional()
  @IsNotEmpty()
  @ApiProperty({ example: 'What is the main idea of paragraph A?' })
  content?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsEnum(QuestionType)
  @ApiProperty({ enum: QuestionType, example: 'MULTIPLE_CHOICE' })
  questionType?: QuestionType;

  @IsOptional()
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
  metadata?: Record<string, any>;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  @ApiProperty({ example: 0, required: false })
  order?: number;
}

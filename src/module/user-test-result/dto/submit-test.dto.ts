import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionType } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SubmitAnswerItemDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    example: 'uuid-question-1',
    description: 'ID câu hỏi',
  })
  idQuestion: string;

  @IsNotEmpty()
  @IsEnum(QuestionType)
  @ApiProperty({
    enum: QuestionType,
    example: 'MULTIPLE_CHOICE',
    description: 'Loại câu hỏi (phải trùng với questionType của Question)',
  })
  answerType: QuestionType;

  @IsNotEmpty()
  @IsObject()
  @ApiProperty({
    description: 'Payload câu trả lời (tuân thủ UserAnswerPayload union type)',
    examples: {
      MCQ: {
        value: { type: 'MULTIPLE_CHOICE', selectedIndexes: [2] },
      },
      TFNG: {
        value: { type: 'TRUE_FALSE_NOT_GIVEN', answer: 'TRUE' },
      },
      Matching: {
        value: { type: 'MATCHING_HEADING', selectedLabel: 'iv' },
      },
      FillIn: {
        value: { type: 'SENTENCE_COMPLETION', answerText: 'carbon dioxide' },
      },
    },
  })
  answerPayload: Record<string, any>;
}

export class SubmitTestDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    example: 'uuid-test-result-1',
    description: 'ID của phiên làm bài (UserTestResult)',
  })
  idTestResult: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @ApiPropertyOptional({
    example: 2400,
    description: 'Thời gian làm bài thực tế (giây)',
  })
  duration?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitAnswerItemDto)
  @ApiProperty({
    type: [SubmitAnswerItemDto],
    description: 'Danh sách câu trả lời của thí sinh',
  })
  answers: SubmitAnswerItemDto[];
}

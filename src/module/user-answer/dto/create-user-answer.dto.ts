import { ApiProperty } from '@nestjs/swagger';
import { QuestionType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsObject } from 'class-validator';

export class CreateUserAnswerDto {
  @IsNotEmpty()
  @ApiProperty({ example: 'question-uuid' })
  idQuestion: string;

  @IsNotEmpty()
  @IsEnum(QuestionType)
  @ApiProperty({
    enum: QuestionType,
    example: 'MULTIPLE_CHOICE',
    description: 'Mirrors the question type for filtering',
  })
  answerType: QuestionType;

  @IsNotEmpty()
  @IsObject()
  @ApiProperty({
    example: { type: 'MULTIPLE_CHOICE', selectedIndexes: [0] },
    description: 'Structured answer payload (see UserAnswerPayload union type)',
  })
  answerPayload: Record<string, any>;
}

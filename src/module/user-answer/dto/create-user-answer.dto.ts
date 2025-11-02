import { ApiProperty } from '@nestjs/swagger';
import { QuestionType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, ValidateIf } from 'class-validator';

export class CreateUserAnswerDto {
  @IsNotEmpty()
  @ApiProperty({ example: '123' })
  idQuestion: string;

  @IsNotEmpty()
  @ApiProperty({ example: '123' })
  idUser: string;

  @ValidateIf((o) => o.userAnswerType === QuestionType.MCQ)
  @ApiProperty({ example: '123' })
  idOption?: string;

  @ValidateIf((o) =>
    [
      QuestionType.TFNG,
      QuestionType.YES_NO_NOTGIVEN,
      QuestionType.FILL_BLANK,
      QuestionType.SHORT_ANSWER,
    ].includes(o.userAnswerType),
  )
  @ApiProperty({ example: 'Some text answer' })
  answerText?: string;

  @IsNotEmpty()
  @IsEnum(QuestionType)
  @ApiProperty({
    enum: QuestionType,
    enumName: 'QuestionType', // để Swagger hiện tên enum
    description: 'Loại câu trả lời (MCQ, TEXT, MATCHING)',
  })
  userAnswerType: QuestionType;

  @ValidateIf((o) => o.userAnswerType === QuestionType.MATCHING)
  @ApiProperty({ example: 'A' })
  matching_key?: string;

  @ValidateIf((o) => o.userAnswerType === QuestionType.MATCHING)
  @ApiProperty({ example: '1' })
  matching_value?: string;

  @IsNotEmpty()
  @ApiProperty({ example: '123' })
  idTestResult: string;

  @ApiProperty({ example: '30' })
  timeSpent: number;

  @ApiProperty({ example: '30' })
  timeRemaining: number;
}

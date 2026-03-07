import { ApiProperty } from '@nestjs/swagger';
import { QuestionType } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateQuestionGroupDto {
  @IsNotEmpty()
  @ApiProperty({ example: '123' })
  idPart: string;

  @IsNotEmpty()
  @ApiProperty({ example: 'Questions 1-5: Choose TRUE, FALSE, or NOT GIVEN' })
  title: string;

  @IsOptional()
  @ApiProperty({ example: 'Read the passage and answer the questions below.', required: false })
  instructions?: string;

  @IsNotEmpty()
  @IsEnum(QuestionType)
  @ApiProperty({ enum: QuestionType, example: 'MULTIPLE_CHOICE' })
  questionType: QuestionType;

  @IsOptional()
  @ApiProperty({ example: 'https://example.com/image.png', required: false })
  imageUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  @ApiProperty({ example: 0, required: false })
  order?: number;
}

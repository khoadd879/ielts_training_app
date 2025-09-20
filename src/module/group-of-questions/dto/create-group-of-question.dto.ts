import { ApiProperty } from '@nestjs/swagger';
import { QuestionType } from '@prisma/client';
import { IsNotEmpty } from 'class-validator';

export class CreateGroupOfQuestionDto {
  @IsNotEmpty()
  @ApiProperty({ example: '123' })
  idDe: string;

  @ApiProperty({ example: '123' })
  @IsNotEmpty()
  idPart: string;

  @IsNotEmpty()
  @ApiProperty({ example: 'MCQ' })
  typeQuestion: QuestionType;

  @IsNotEmpty()
  @ApiProperty({ example: 'title' })
  title: string;

  @IsNotEmpty()
  @ApiProperty({ example: '1' })
  startingOrder: number;

  @IsNotEmpty()
  @ApiProperty({ example: '3' })
  endingOrder: number;
}

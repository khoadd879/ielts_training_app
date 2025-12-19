import { ApiProperty } from '@nestjs/swagger';
import { QuestionType } from '@prisma/client';
import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateGroupOfQuestionDto {
  @IsNotEmpty()
  @ApiProperty({ example: '123' })
  idTest: string;

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
  @IsNumber()
  @ApiProperty({ example: '1' })
  quantity: number;

  @IsOptional()
  @ApiProperty({ example: '1' })
  img: string;
}

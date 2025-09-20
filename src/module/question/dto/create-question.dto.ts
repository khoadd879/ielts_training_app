import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class CreateQuestionDto {
  @IsNotEmpty()
  @ApiProperty({ example: '123' })
  idGroupOfQuestions: string;

  @IsNotEmpty()
  @ApiProperty({ example: '123' })
  idPart: string;

  @IsNotEmpty()
  @ApiProperty({ example: '5' })
  numberQuestion: number;

  @IsNotEmpty()
  @ApiProperty({ example: 'example' })
  content: string;
}

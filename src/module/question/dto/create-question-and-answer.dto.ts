import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';
import { CreateAnswerDto } from 'src/module/answer/dto/create-answer.dto';

export class CreateQuestionAndAnswerDto {
  @ApiProperty({
    example: 'group1',
    description: 'ID of the group of questions',
  })
  @IsNotEmpty()
  idGroupOfQuestions: string;

  @ApiProperty({ example: 'part1', description: 'ID of the part' })
  @IsNotEmpty()
  idPart: string;

  @ApiProperty({ example: 1, description: 'Question number in the group' })
  @IsNotEmpty()
  numberQuestion: number;

  @ApiProperty({
    example: 'What is the capital of France?',
    description: 'Content of the question',
  })
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    example: [
      { answer_text: 'Paris', matching_key: 'A', matching_value: 'Correct' },
      { answer_text: 'London', matching_key: 'B', matching_value: 'Incorrect' },
    ],
    description: 'List of answers for the question',
  })
  @IsOptional()
  answers?: CreateAnswerDto[];
}

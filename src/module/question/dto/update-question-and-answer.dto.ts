import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateQuestionAndAnswerDto } from './create-question-and-answer.dto';
import { IsNotEmpty } from 'class-validator';

export class UpdateQuestionAndAnswerDto extends PartialType(
  CreateQuestionAndAnswerDto,
) {
  @ApiProperty({
    example: 'uuid-of-question',
    description: 'ID of the question to update',
  })
  @IsNotEmpty()
  idQuestion: string;
}

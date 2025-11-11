import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateQuestionAndAnswerDto } from './create-question-and-answer.dto';

export class createManyQuestionsDto {
  @ApiProperty({
    type: [CreateQuestionAndAnswerDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionAndAnswerDto)
  questions: CreateQuestionAndAnswerDto[];
}

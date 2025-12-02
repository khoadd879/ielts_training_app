import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateQuestionAndAnswerDto } from './update-question-and-answer.dto';

export class UpdateManyQuestionsDto {
  @ApiProperty({
    type: [UpdateQuestionAndAnswerDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateQuestionAndAnswerDto)
  questions: UpdateQuestionAndAnswerDto[];
}

import { ApiProperty } from '@nestjs/swagger';
import { CreateQuestionDto } from './create-question.dto';
import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class createManyQuestionsDto {
  @ApiProperty({
    type: [CreateQuestionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  question: CreateQuestionDto[];
}

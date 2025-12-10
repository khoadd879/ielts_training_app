import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateUserAnswerDto } from './create-user-answer.dto';
import { ApiProperty } from '@nestjs/swagger';

export class CreateManyUserAnswerDto {
  @IsArray()
  @ValidateNested({ each: true }) 
  @ApiProperty({ type: [CreateUserAnswerDto]})
  @Type(() => CreateUserAnswerDto)
  answers: CreateUserAnswerDto[];
}
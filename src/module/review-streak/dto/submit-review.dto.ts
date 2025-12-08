import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class VocabularyAnswerDto {
  @ApiProperty({ example: '456' })
  @IsUUID('4')
  @IsNotEmpty()
  idVocab: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  @IsNotEmpty()
  isCorrect: boolean;
}

export class SubmitReviewDto {
  @ApiProperty({ example: '123' })
  @IsUUID('4')
  @IsNotEmpty()
  idUser: string;

  @ApiProperty({ type: [VocabularyAnswerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VocabularyAnswerDto)
  answers: VocabularyAnswerDto[];
}

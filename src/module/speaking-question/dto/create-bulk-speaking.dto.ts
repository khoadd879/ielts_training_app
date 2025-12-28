import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

class QuestionItemDto {
  @ApiProperty({ example: 'What is your favorite food?' })
  @IsNotEmpty()
  @IsString()
  prompt: string;

  @ApiPropertyOptional({
    example: ['Why do you like it?', 'How often do you eat it?'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  subPrompts?: string[];

  @ApiProperty({ example: 60, description: 'Thời gian nói cho câu này (giây)' })
  @IsInt()
  @Type(() => Number)
  speakingTime: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Type(() => Number)
  order: number;
}

export class CreateBulkSpeakingQuestionDto {
  @IsNotEmpty()
  @ApiProperty({ example: '123', description: 'ID của Speaking Task' })
  idSpeakingTask: string;

  @IsNotEmpty()
  @ApiProperty({ example: 'Your hometown' })
  @IsString()
  topic: string;

  @ApiProperty({ example: 0, description: 'Thời gian chuẩn bị chung (Part 1/3 thường là 0)' })
  @IsInt()
  @Type(() => Number)
  preparationTime: number;

  @ApiProperty({ type: [QuestionItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionItemDto)
  questions: QuestionItemDto[];
}
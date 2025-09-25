import { ApiProperty } from '@nestjs/swagger';
import { WritingTaskType } from '@prisma/client';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class CreateWritingTaskDto {
  @IsNotEmpty()
  idDe: string;

  @IsNotEmpty()
  @IsEnum(WritingTaskType)
  @ApiProperty({
    enum: WritingTaskType,
    enumName: 'WritingTaskType',
    description: 'Loại câu trả lời (TASK1, TASK2)',
  })
  task_type: WritingTaskType;

  @IsNotEmpty()
  prompt: string;

  @IsNotEmpty()
  time_limit: number;

  @IsNotEmpty()
  word_limit: number;
}

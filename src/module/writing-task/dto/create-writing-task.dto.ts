import { ApiProperty } from '@nestjs/swagger';
import { WritingTaskType } from '@prisma/client';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class CreateWritingTaskDto {
  @IsNotEmpty()
  @ApiProperty({ example: '123' })
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
  @ApiProperty({ example: 'promt' })
  prompt: string;

  @IsNotEmpty()
  @ApiProperty({ example: '60' })
  time_limit: number;

  @IsNotEmpty()
  @ApiProperty({ example: '150' })
  word_limit: number;
}

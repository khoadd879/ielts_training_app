import { ApiProperty } from '@nestjs/swagger';
import { WritingTaskType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateWritingTaskDto {
  @IsNotEmpty()
  @ApiProperty({ example: '123' })
  idTest: string;

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
  title: string;

  @IsNotEmpty()
  @ApiProperty({ example: '60' })
  time_limit: number;

  @IsOptional()
  @ApiProperty({ example: 'img', nullable: true })
  image: string;
}

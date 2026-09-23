import { IsBoolean, IsIn, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const DAILY_TASK_TYPES = [
  'READING',
  'LISTENING',
  'WRITING',
  'SPEAKING',
  'VOCABULARY',
  'GRAMMAR',
] as const;

export type DailyTaskType = typeof DAILY_TASK_TYPES[number];

export class CompleteTaskDto {
  @ApiProperty({ description: 'Whether the task is completed' })
  @IsBoolean()
  completed: boolean;

  @ApiProperty({
    description:
      'DailyTask.type from FE — must match the actual task so calculatePlan overlay can find the row',
    enum: DAILY_TASK_TYPES,
  })
  @IsIn(DAILY_TASK_TYPES, {
    message: `taskType must be one of: ${DAILY_TASK_TYPES.join(', ')}`,
  })
  taskType: DailyTaskType;

  @ApiPropertyOptional({ description: 'Timestamp when task was completed' })
  @IsOptional()
  @IsDateString()
  completedAt?: string;
}

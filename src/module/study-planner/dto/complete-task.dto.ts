import { IsBoolean, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CompleteTaskDto {
  @ApiProperty({ description: 'Whether the task is completed' })
  @IsBoolean()
  completed: boolean;

  @ApiPropertyOptional({ description: 'Timestamp when task was completed' })
  @IsOptional()
  @IsDateString()
  completedAt?: string;
}
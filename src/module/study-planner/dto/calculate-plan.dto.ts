import { IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CalculatePlanDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  idUser: string;

  @ApiProperty({ description: 'Current band score (average of 4 skills)', minimum: 0, maximum: 9 })
  @IsNumber()
  @Min(0)
  @Max(9)
  currentBand: number;

  @ApiProperty({ description: 'Target band score', minimum: 0, maximum: 9 })
  @IsNumber()
  @Min(0)
  @Max(9)
  targetBand: number;

  @ApiProperty({ description: 'Days until exam date', maximum: 365 })
  @IsNumber()
  @Min(1)
  @Max(365)
  daysUntilExam: number;

  @ApiPropertyOptional({ description: 'Study minutes per day', default: 120 })
  @IsOptional()
  @IsNumber()
  @Min(60)
  @Max(240)
  studyMinutesPerDay?: number = 120;

  @ApiPropertyOptional({ description: 'Study hours per day (alternative to minutes)', minimum: 1, maximum: 4 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(4)
  studyHoursPerDay?: number;
}

export class GetPlanDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  idUser: string;
}
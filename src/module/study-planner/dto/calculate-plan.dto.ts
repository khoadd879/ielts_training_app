import { IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CalculatePlanDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  idUser: string;

  @ApiPropertyOptional({ description: 'Current band score (average of 4 skills)', minimum: 0, maximum: 9 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(9)
  currentBand?: number | null;

  @ApiPropertyOptional({ description: 'Target band score', minimum: 0, maximum: 9 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(9)
  targetBand?: number | null;

  @ApiPropertyOptional({ description: 'Days until exam date (null if user has not set exam date yet)', maximum: 365 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  daysUntilExam?: number | null;

  @ApiPropertyOptional({ description: 'Study minutes per day (null if user has not set preference yet)', minimum: 60, maximum: 240 })
  @IsOptional()
  @IsNumber()
  @Min(60)
  @Max(240)
  studyMinutesPerDay?: number | null;

  @ApiPropertyOptional({ description: 'Study hours per day (alternative to minutes)', minimum: 1, maximum: 4 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(4)
  studyHoursPerDay?: number;

  @ApiPropertyOptional({ description: 'History months for band calculation (3, 6, or 12)', minimum: 1, maximum: 12, default: 6 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(12)
  historyMonths?: number = 6;
}

export class GetPlanDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  idUser: string;
}
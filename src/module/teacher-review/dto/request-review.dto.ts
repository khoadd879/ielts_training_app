import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString } from 'class-validator';

export class RequestReviewDto {
  @ApiPropertyOptional({
    description: 'Optional notes from the student',
    example: 'Please provide detailed feedback on task achievement',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { GradingStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdateUserWritingSubmissionDto {
  @IsOptional()
  @IsEnum(GradingStatus)
  @ApiProperty({
    enum: GradingStatus,
    example: GradingStatus.COMPLETED,
    description: 'The grading status of the submission',
    required: false,
  })
  aiGradingStatus?: GradingStatus;
}

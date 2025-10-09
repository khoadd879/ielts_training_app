import { ApiProperty } from '@nestjs/swagger';
import { WritingStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdateUserWritingSubmissionDto {
  @IsOptional()
  @IsEnum(WritingStatus)
  @ApiProperty({
    enum: WritingStatus,
    example: WritingStatus.GRADED,
    description: 'The status of the submission (e.g., triggering a re-grade)',
    required: false,
  })
  status?: WritingStatus;
}

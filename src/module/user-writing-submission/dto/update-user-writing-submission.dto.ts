import { WritingStatus } from '@prisma/client';
import { CreateUserWritingSubmissionDto } from './create-user-writing-submission.dto';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserWritingSubmissionDto extends CreateUserWritingSubmissionDto {
  @IsNotEmpty()
  @IsEnum(WritingStatus)
  @ApiProperty({
    enum: WritingStatus,
    enumName: 'WritingStatus',
    description: 'Loại câu trả lời (SUBMITTED, GRADED)',
  })
  status: WritingStatus;
}

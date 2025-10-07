import { WritingStatus } from '@prisma/client';
import { CreateUserWritingSubmissionDto } from './create-user-writing-submission.dto';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserWritingSubmissionDto extends CreateUserWritingSubmissionDto {
  @IsOptional()
  @IsNumber()
  @ApiProperty({
    example: 7.5,
    required: false,
    nullable: true,
    description: 'Điểm chấm (thang 1–9)',
  })
  score?: number;

  @IsOptional()
  @ApiProperty({
    example: {
      overall: 'Good structure and ideas.',
      coherence: 'Well organized.',
      lexical: 'Rich vocabulary with few errors.',
      grammar: 'Mostly accurate.',
      suggestions: ['Use more complex structures', 'Add more examples'],
    },
    required: false,
    nullable: true,
    type: Object,
    description: 'Phản hồi chi tiết của giám khảo hoặc AI',
  })
  feedback?: Record<string, any>;

  @IsNotEmpty()
  @IsEnum(WritingStatus)
  @ApiProperty({
    enum: WritingStatus,
    enumName: 'WritingStatus',
    example: WritingStatus.SUBMITTED,
    description: 'Trạng thái bài viết (SUBMITTED hoặc GRADED)',
  })
  status: WritingStatus;
}

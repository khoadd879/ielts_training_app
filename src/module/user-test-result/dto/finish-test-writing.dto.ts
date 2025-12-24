import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class WritingSubmissionItem {
  @ApiProperty({
    description: 'ID của Writing Task (Task 1 hoặc Task 2)',
    example: 'uuid-writing-task-1',
  })
  @IsString()
  idWritingTask: string;

  @ApiProperty({
    description: 'Nội dung bài viết của thí sinh',
    example:
      'In this essay, I will discuss the importance of environmental protection...',
  })
  @IsString()
  submission_text: string;
}

export class FinishTestWritingDto {
  @ApiPropertyOptional({
    description: 'Danh sách các bài làm Writing (tối đa 2 task)',
    type: [WritingSubmissionItem],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WritingSubmissionItem)
  writingSubmissions?: WritingSubmissionItem[];
}

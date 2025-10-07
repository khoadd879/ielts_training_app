import { ApiProperty } from '@nestjs/swagger';
import { WritingStatus } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateUserWritingSubmissionDto {
  @IsNotEmpty()
  @ApiProperty({ example: 'user-uuid-123' })
  idUser: string;

  @IsNotEmpty()
  @ApiProperty({ example: 'writing-task-uuid-123' })
  idWritingTask: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    example: 'This is my essay about global warming...',
    description: 'Bài viết của người dùng',
  })
  submission_text: string;
}

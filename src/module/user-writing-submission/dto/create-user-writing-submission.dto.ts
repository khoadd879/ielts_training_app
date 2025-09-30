import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class CreateUserWritingSubmissionDto {
  @IsNotEmpty()
  @ApiProperty({ example: '123' })
  idUser: string;

  @IsNotEmpty()
  @ApiProperty({ example: '123' })
  idWritingTask: string;

  @IsNotEmpty()
  @ApiProperty({ example: 'text' })
  submission_text: string;

  @IsNumber()
  @ApiProperty({ example: '123', nullable: true })
  score?: number;

  @ApiProperty({ example: '123', nullable: true })
  feedback?: string;
}

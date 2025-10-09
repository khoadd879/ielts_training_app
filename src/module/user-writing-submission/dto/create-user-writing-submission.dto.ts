import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateUserWritingSubmissionDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'user-uuid-123' })
  idUser: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'writing-task-uuid-123' })
  idWritingTask: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    example: 'This is my essay about global warming...',
    description: 'The user’s essay text',
  })
  submission_text: string;
}

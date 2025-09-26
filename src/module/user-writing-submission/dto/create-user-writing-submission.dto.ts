import { IsNotEmpty, IsNumber } from 'class-validator';

export class CreateUserWritingSubmissionDto {
  @IsNotEmpty()
  idUser: string;

  @IsNotEmpty()
  idWritingTask: string;

  @IsNotEmpty()
  submission_text: string;

  @IsNumber()
  score?: number;

  feedback?: string;
}

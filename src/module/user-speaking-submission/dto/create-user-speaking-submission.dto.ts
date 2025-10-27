import { IsNotEmpty } from 'class-validator';

export class CreateUserSpeakingSubmissionDto {
  @IsNotEmpty()
  idUser: string;

  @IsNotEmpty()
  idSpeakingTask: string;

  @IsNotEmpty()
  audioUrl: string;
}

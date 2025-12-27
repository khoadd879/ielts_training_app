import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateUserSpeakingSubmissionDto {
  @IsNotEmpty()
  @IsString()
  idUser: string;

  @IsNotEmpty()
  @IsString()
  idSpeakingTask: string;

  @IsOptional() 
  @IsString()
  idTestResult?: string; 

  @IsOptional()
  @IsString()
  audioUrl?: string;
}
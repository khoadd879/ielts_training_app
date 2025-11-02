import { IsNotEmpty } from 'class-validator';

export class CreateSpeakingTaskDto {
  @IsNotEmpty()
  idTest: string;

  @IsNotEmpty()
  title: string;

  audioPromptUrl?: string;
}

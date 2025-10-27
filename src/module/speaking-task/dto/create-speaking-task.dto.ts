import { IsNotEmpty } from 'class-validator';

export class CreateSpeakingTaskDto {
  @IsNotEmpty()
  idDe: string;

  @IsNotEmpty()
  title: string;

  audioPromptUrl?: string;
}

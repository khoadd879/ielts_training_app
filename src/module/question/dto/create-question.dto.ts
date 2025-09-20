import { IsNotEmpty } from 'class-validator';

export class CreateQuestionDto {
  @IsNotEmpty()
  idGroupOfQuestions: string;

  @IsNotEmpty()
  idPart: string;

  @IsNotEmpty()
  numberQuestion: number;

  @IsNotEmpty()
  content: string;
}

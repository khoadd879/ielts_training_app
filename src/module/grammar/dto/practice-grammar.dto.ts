import { IsString, IsArray } from 'class-validator';

export class SubmitGrammarPracticeDto {
  @IsString()
  idUser: string;

  @IsArray()
  answers: {
    exerciseId: string;
    isCorrect: boolean;
  }[];
}

export class SubmitGrammarAnswerDto {
  @IsString()
  idExercise: string;

  @IsString()
  userAnswer: string;
}

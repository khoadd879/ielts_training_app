import { IsString, IsArray, IsNumber, Min, Max } from 'class-validator';

export class GetPracticeDto {
  @IsString()
  idUser: string;

  @IsNumber()
  @Min(5)
  @Max(50)
  count: number = 20;

  @IsString()
  mode: 'flashcard' | 'fill' | 'multiple' = 'flashcard';
}

export class SubmitPracticeDto {
  @IsString()
  idUser: string;

  @IsString()
  mode: 'flashcard' | 'fill' | 'multiple';

  @IsArray()
  answers: {
    idVocab: string;
    isCorrect: boolean;
    userAnswer?: string;
  }[];
}

import { QuestionType } from '@prisma/client';
import { IsNotEmpty } from 'class-validator';

export class CreateGroupOfQuestionDto {
  @IsNotEmpty({ message: 'idDe must not be empty' })
  idDe: string;

  @IsNotEmpty({ message: 'idPart must not be empty' })
  idPart: string;

  @IsNotEmpty({ message: 'type of question must not be empty' })
  typeQuestion: QuestionType;

  @IsNotEmpty({ message: 'title must not be empty' })
  title: string;

  @IsNotEmpty({ message: 'starting order must not be empty' })
  startingOrder: number;

  @IsNotEmpty({ message: 'ending order must not be empty' })
  endingOrder: number;
}

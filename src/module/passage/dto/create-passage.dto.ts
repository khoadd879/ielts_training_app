import { IsNotEmpty, IsOptional } from 'class-validator';

export class CreatePassageDto {
  @IsNotEmpty({ message: 'idPart must not be empty' })
  idPart: string;

  @IsNotEmpty({ message: 'title must not be empty' })
  title: string;

  @IsNotEmpty({ message: 'content must not be empty' })
  content: string;

  @IsOptional()
  image: string;

  @IsOptional()
  description: string;

  @IsNotEmpty({ message: 'Number paragraph must not be empty' })
  numberParagraph: number;
}

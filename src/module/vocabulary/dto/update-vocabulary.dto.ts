import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateVocabularyDto {
  @ApiProperty({ example: '123' })
  @IsNotEmpty({ message: 'User ID should not be empty' })
  idUser: string;

  @ApiProperty({ example: 'example' })
  @IsNotEmpty({ message: 'Vocabulary word should not be empty' })
  word: string;

  @ApiProperty({ example: '/ˈɛɡzæmpəl/' })
  @IsOptional()
  phonetic: string;

  @ApiProperty({
    example:
      'a thing characteristic of its kind or illustrating a general rule',
  })
  @IsNotEmpty({ message: 'Meaning should not be empty' })
  meaning: string;

  @ApiProperty({ example: 'This is an example sentence.' })
  @IsOptional()
  example: string;

  @ApiProperty({ example: '123' })
  idLoaiTuVung: string;
}

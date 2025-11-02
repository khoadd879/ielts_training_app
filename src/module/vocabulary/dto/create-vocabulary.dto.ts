import { ApiProperty } from '@nestjs/swagger';
import { Level, VocabType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateVocabularyDto {
  @ApiProperty({ example: '123' })
  @IsNotEmpty({ message: 'User ID should not be empty' })
  idUser: string;

  @ApiProperty({ example: '123' })
  @IsOptional()
  idTopic: string;

  @ApiProperty({ example: 'example' })
  @IsNotEmpty({ message: 'Vocabulary word should not be empty' })
  word: string;

  @ApiProperty({ example: '/ˈɛɡzæmpəl/' })
  @IsOptional()
  phonetic: string;

  @ApiProperty({
    example: 'Mid',
  })
  @ApiProperty({ example: 'Mid', enum: Level })
  @IsEnum(Level)
  level: Level;

  @IsNotEmpty({ message: 'Meaning should not be empty' })
  meaning: string;

  @ApiProperty({ example: 'This is an example sentence.' })
  @IsOptional()
  example: string;

  @ApiProperty({ example: 'NOUN', enum: VocabType })
  @IsNotEmpty({ message: 'Vocabulary type should not be empty' })
  @IsEnum(VocabType, { message: 'Invalid vocabulary type' })
  VocabType: VocabType;
}

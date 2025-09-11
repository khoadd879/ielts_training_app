import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class CreateTypeVocabularyDto {
  @IsNotEmpty()
  @ApiProperty({ example: 'Noun' })
  nameLoaiTuVung: string;
}

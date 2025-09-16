import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AddVocabularyToTopicDto {
  @ApiProperty({ example: 'tuVung123' })
  @IsString()
  @IsNotEmpty({ message: 'idTuVung must not be empty' })
  idTuVung: string;

  @ApiProperty({ example: 'topic456' })
  @IsString()
  @IsNotEmpty({ message: 'idTopic must not be empty' })
  idTopic: string;
}

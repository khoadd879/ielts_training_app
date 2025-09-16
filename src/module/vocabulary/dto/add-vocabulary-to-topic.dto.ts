import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AddVocabularyToTopicDto {
  @ApiProperty({ description: 'ID của từ vựng', example: 'tuVung123' })
  @IsString()
  @IsNotEmpty()
  idTuVung: string;

  @ApiProperty({ description: 'ID của topic', example: 'topic456' })
  @IsString()
  @IsNotEmpty()
  idTopic: string;
}

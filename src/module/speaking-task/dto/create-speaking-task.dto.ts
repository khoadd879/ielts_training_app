import { ApiProperty } from '@nestjs/swagger';
import { SpeakingPartType } from '@prisma/client';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class CreateSpeakingTaskDto {
  @ApiProperty({example: '123'})
  @IsNotEmpty()
  idTest: string;

  @ApiProperty({example: 'title'})
  @IsNotEmpty()
  title: string;

  @ApiProperty({example: 'PART1'})
  @IsNotEmpty()
  @IsEnum(SpeakingPartType)
  part: SpeakingPartType
}

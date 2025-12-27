import { SpeakingPartType } from '@prisma/client';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class CreateSpeakingTaskDto {
  @IsNotEmpty()
  idTest: string;

  @IsNotEmpty()
  title: string;

  @IsNotEmpty()
  @IsEnum(SpeakingPartType)
  part: SpeakingPartType
}

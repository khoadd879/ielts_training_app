import { ApiProperty } from '@nestjs/swagger';
import { SpeakingPartType } from '@prisma/client';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class CreateSpeakingQuestionDto {
  @IsNotEmpty()
  @ApiProperty({ example: '123' })
  idSpeakingTask: string;

  @IsNotEmpty()
  @IsEnum(SpeakingPartType)
  @ApiProperty({ example: 'PART1', enum: SpeakingPartType })
  part: SpeakingPartType;

  @ApiProperty({ example: 'Describe your hometown' })
  topic?: string;

  @IsNotEmpty()
  @ApiProperty({ example: 'What is your favorite food?' })
  prompt: string;

  @ApiProperty({ example: ['Why do you like it?', 'How often do you eat it?'] })
  subPrompts?: string[];

  @ApiProperty({ example: 30 })
  preparationTime?: number;

  @ApiProperty({ example: 60 })
  speakingTime?: number;

  @IsNotEmpty()
  @ApiProperty({ example: 1 })
  order: number;
}

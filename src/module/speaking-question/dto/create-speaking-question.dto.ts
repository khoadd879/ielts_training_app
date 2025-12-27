import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SpeakingPartType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateSpeakingQuestionDto {
  @IsNotEmpty()
  @ApiProperty({ example: '123' })
  idSpeakingTask: string;

  @IsOptional()
  @ApiPropertyOptional({ example: 'Describe your hometown' })
  topic?: string;

  @IsOptional()
  @ApiProperty({ example: 'What is your favorite food?' })
  prompt?: string;

  @ApiPropertyOptional({
    example: ['Why do you like it?', 'How often do you eat it?'],
    type: [String],
  })
  @IsOptional()
  subPrompts?: string[];

  @ApiProperty({ example: 2 })
  preparationTime?: number;

  @ApiProperty({ example: 60 })
  speakingTime?: number;

  @IsNotEmpty()
  @ApiProperty({ example: 1 })
  order: number;
}

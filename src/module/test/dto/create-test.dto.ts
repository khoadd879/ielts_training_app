import { ApiProperty } from '@nestjs/swagger';
import { Level, TestType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateTestDto {
  @IsNotEmpty()
  @ApiProperty({ example: '123' })
  idUser: string;

  @ApiProperty({ example: 'Sample Test Title' })
  @IsNotEmpty({ message: 'Title cannot be empty' })
  title: string;

  @ApiProperty({ example: 'LISTENING', enum: TestType })
  @IsEnum(TestType)
  @IsNotEmpty({ message: 'Test type is required' })
  testType: TestType;

  @ApiProperty({ example: 'This is a test description' })
  @IsOptional()
  description: string;

  @ApiProperty({ example: 60 })
  @IsNotEmpty({ message: 'Duration is required' })
  duration: number;

  @ApiProperty({ example: 'Mid', enum: Level })
  @IsEnum(Level)
  level: Level;

  @ApiProperty({ example: 10 })
  @IsNotEmpty({ message: 'Number of questions is required' })
  numberQuestion: number;

  @ApiProperty({ example: 'http://example.com/image.png' })
  @IsOptional()
  img: string;

  @ApiProperty({ example: 'http://example.com/audio.mp4' })
  audioUrl: string;
}

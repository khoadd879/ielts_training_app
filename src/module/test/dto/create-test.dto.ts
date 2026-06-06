import { ApiProperty } from '@nestjs/swagger';
import { Level, TestType } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateTestDto {
  @IsString()
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
  @IsInt()
  @Min(1)
  duration: number;

  @ApiProperty({ example: 'Mid', enum: Level })
  @IsEnum(Level)
  @IsNotEmpty({ message: 'Level is required' })
  level: Level;

  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(1)
  numberQuestion: number;

  @ApiProperty({ example: 'http://example.com/image.png' })
  @IsOptional()
  img: string;

  @ApiProperty({ example: 'http://example.com/audio.mp4' })
  @IsOptional()
  @IsString()
  audioUrl: string;
}

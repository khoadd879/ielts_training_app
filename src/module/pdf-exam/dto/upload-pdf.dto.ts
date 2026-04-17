import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional } from 'class-validator';

export enum TestType {
  LISTENING = 'LISTENING',
  READING = 'READING',
  WRITING = 'WRITING',
  SPEAKING = 'SPEAKING',
}

export class UploadPdfDto {
  @ApiProperty({
    description: 'Type of IELTS test',
    enum: TestType,
    example: 'READING',
  })
  @IsEnum(TestType)
  @IsNotEmpty()
  testType!: TestType;

  @ApiProperty({
    description: 'Optional title for the test (auto-detected if not provided)',
    required: false,
    example: 'IELTS Reading Practice Test 1',
  })
  @IsOptional()
  @IsNotEmpty()
  title?: string;

  @ApiProperty({
    description: 'Optional level hint for the test',
    required: false,
    enum: ['Low', 'Mid', 'High', 'Great'],
    example: 'Mid',
  })
  @IsOptional()
  level?: 'Low' | 'Mid' | 'High' | 'Great';
}

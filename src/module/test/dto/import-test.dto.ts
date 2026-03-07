import { ApiProperty } from '@nestjs/swagger';
import { Level, QuestionType, TestType, WritingTaskType, SpeakingPartType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';

// ============================================================================
// Mass-import DTOs — AI Crawler sends a single JSON to create an entire test
// ============================================================================

export class ImportQuestionDto {
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @ApiProperty({ example: 1 })
  questionNumber: number;

  @IsNotEmpty()
  @ApiProperty({ example: 'What is the main idea of paragraph A?' })
  content: string;

  @IsNotEmpty()
  @IsEnum(QuestionType)
  @ApiProperty({ enum: QuestionType, example: 'MULTIPLE_CHOICE' })
  questionType: QuestionType;

  @IsNotEmpty()
  @IsObject()
  @ApiProperty({
    description: 'Type-specific metadata including correct answers (see QuestionMetadata)',
  })
  metadata: Record<string, any>;

  @IsOptional()
  @IsInt()
  @Min(0)
  @ApiProperty({ example: 0, required: false })
  order?: number;
}

export class ImportQuestionGroupDto {
  @IsNotEmpty()
  @ApiProperty({ example: 'Questions 1-5: TRUE/FALSE/NOT GIVEN' })
  title: string;

  @IsOptional()
  @ApiProperty({ example: 'Read the passage and decide if the statements are TRUE, FALSE, or NOT GIVEN' })
  instructions?: string;

  @IsNotEmpty()
  @IsEnum(QuestionType)
  @ApiProperty({ enum: QuestionType, example: 'TRUE_FALSE_NOT_GIVEN' })
  questionType: QuestionType;

  @IsOptional()
  @ApiProperty({ required: false })
  imageUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @ApiProperty({ example: 0, required: false })
  order?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportQuestionDto)
  @ApiProperty({ type: [ImportQuestionDto] })
  questions: ImportQuestionDto[];
}

export class ImportPassageDto {
  @IsNotEmpty()
  @ApiProperty({ example: 'The History of Aviation' })
  title: string;

  @IsNotEmpty()
  @ApiProperty({ example: '<p>Long passage content here...</p>' })
  content: string;

  @IsOptional()
  @ApiProperty({ required: false })
  image?: string;

  @IsOptional()
  @ApiProperty({ required: false })
  description?: string;

  @IsOptional()
  @ApiProperty({ required: false })
  audioUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @ApiProperty({ example: 5, required: false })
  numberParagraph?: number;
}

export class ImportPartDto {
  @IsNotEmpty()
  @ApiProperty({ example: 'Part 1' })
  namePart: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @ApiProperty({ example: 0, required: false })
  order?: number;

  @IsOptional()
  @ApiProperty({ required: false })
  audioUrl?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ImportPassageDto)
  @ApiProperty({ type: ImportPassageDto, required: false })
  passage?: ImportPassageDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportQuestionGroupDto)
  @ApiProperty({ type: [ImportQuestionGroupDto] })
  questionGroups: ImportQuestionGroupDto[];
}

export class ImportFullTestDto {
  @IsNotEmpty()
  @ApiProperty({ example: '123', description: 'ID of the user creating this test' })
  idUser: string;

  @IsNotEmpty()
  @ApiProperty({ example: 'Cambridge IELTS 18 - Reading Test 1' })
  title: string;

  @IsOptional()
  @ApiProperty({ required: false })
  description?: string;

  @IsOptional()
  @ApiProperty({ required: false })
  img?: string;

  @IsNotEmpty()
  @IsEnum(TestType)
  @ApiProperty({ enum: ['READING', 'LISTENING'], example: 'READING' })
  testType: TestType;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @ApiProperty({ example: 3600, description: 'Duration in seconds' })
  duration: number;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @ApiProperty({ example: 40 })
  numberQuestion: number;

  @IsOptional()
  @ApiProperty({ required: false, description: 'Master audio URL for Listening tests' })
  audioUrl?: string;

  @IsOptional()
  @IsEnum(Level)
  @ApiProperty({ enum: Level, required: false })
  level?: Level;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportPartDto)
  @ApiProperty({ type: [ImportPartDto] })
  parts: ImportPartDto[];
}

// ============================================================================
// Writing Test Import
// ============================================================================

export class ImportWritingTaskDto {
  @IsNotEmpty()
  @ApiProperty({ example: 'Describe the chart below' })
  title: string;

  @IsNotEmpty()
  @IsEnum(WritingTaskType)
  @ApiProperty({ enum: WritingTaskType, example: 'TASK1' })
  taskType: WritingTaskType;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @ApiProperty({ example: 1200, description: 'Time limit in seconds' })
  timeLimit: number;

  @IsOptional()
  @ApiProperty({ required: false })
  image?: string;

  @IsOptional()
  @ApiProperty({ required: false })
  instructions?: string;
}

export class CreateWritingTestDto {
  @IsNotEmpty()
  @ApiProperty({ example: '123' })
  idUser: string;

  @IsNotEmpty()
  @ApiProperty({ example: 'IELTS Writing Test 1' })
  title: string;

  @IsOptional()
  @ApiProperty({ required: false })
  description?: string;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @ApiProperty({ example: 3600 })
  duration: number;

  @IsOptional()
  @IsEnum(Level)
  @ApiProperty({ enum: Level, required: false })
  level?: Level;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportWritingTaskDto)
  @ApiProperty({ type: [ImportWritingTaskDto] })
  writingTasks: ImportWritingTaskDto[];
}

// ============================================================================
// Speaking Test Import
// ============================================================================

export class ImportSpeakingQuestionDto {
  @IsOptional()
  @ApiProperty({ required: false })
  topic?: string;

  @IsOptional()
  @ApiProperty({ required: false })
  prompt?: string;

  @IsOptional()
  @ApiProperty({ required: false, description: 'Cue card bullet points for Part 2' })
  subPrompts?: any;

  @IsOptional()
  @IsInt()
  @Min(0)
  @ApiProperty({ example: 0, required: false })
  preparationTime?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @ApiProperty({ example: 120, required: false })
  speakingTime?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @ApiProperty({ example: 0, required: false })
  order?: number;
}

export class ImportSpeakingTaskDto {
  @IsNotEmpty()
  @ApiProperty({ example: 'Part 1 - Introduction' })
  title: string;

  @IsNotEmpty()
  @IsEnum(SpeakingPartType)
  @ApiProperty({ enum: SpeakingPartType, example: 'PART1' })
  part: SpeakingPartType;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportSpeakingQuestionDto)
  @ApiProperty({ type: [ImportSpeakingQuestionDto] })
  questions: ImportSpeakingQuestionDto[];
}

export class CreateSpeakingTestDto {
  @IsNotEmpty()
  @ApiProperty({ example: '123' })
  idUser: string;

  @IsNotEmpty()
  @ApiProperty({ example: 'IELTS Speaking Test 1' })
  title: string;

  @IsOptional()
  @ApiProperty({ required: false })
  description?: string;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @ApiProperty({ example: 840, description: 'Duration in seconds' })
  duration: number;

  @IsOptional()
  @IsEnum(Level)
  @ApiProperty({ enum: Level, required: false })
  level?: Level;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportSpeakingTaskDto)
  @ApiProperty({ type: [ImportSpeakingTaskDto] })
  speakingTasks: ImportSpeakingTaskDto[];
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionType } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// ============================================================================
// Input DTOs (for API requests)
// ============================================================================

export class ExtractedQuestionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  idQuestion?: string;

  @ApiProperty({ description: 'Question number', example: 1 })
  @IsNumber()
  questionNumber!: number;

  @ApiProperty({ description: 'Question text or prompt' })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiPropertyOptional({ enum: QuestionType })
  @IsOptional()
  @IsEnum(QuestionType)
  questionType?: QuestionType;

  @ApiPropertyOptional({ description: 'Extracted metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Extraction confidence', example: 0.85 })
  @IsOptional()
  @IsNumber()
  confidence?: number;

  @ApiPropertyOptional({ description: 'Extraction warnings' })
  @IsOptional()
  @IsArray()
  warnings?: string[];
}

export class ExtractedQuestionGroupDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  idQuestionGroup?: string;

  @ApiProperty({ description: 'Group title', example: 'Questions 1-5' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({ description: 'Group instructions' })
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiPropertyOptional({ enum: QuestionType })
  @IsOptional()
  @IsEnum(QuestionType)
  questionType?: QuestionType;

  @ApiProperty({ type: [ExtractedQuestionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtractedQuestionDto)
  questions!: ExtractedQuestionDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  order?: number;
}

export class ExtractedPassageDto {
  @ApiProperty({ description: 'Passage title' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ description: 'Full passage text' })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiPropertyOptional({ description: 'Passage image URL' })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({ description: 'Passage description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Number of paragraphs' })
  @IsOptional()
  @IsNumber()
  numberParagraph?: number;
}

export class ExtractedPartDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  idPart?: string;

  @ApiProperty({ description: 'Part name', example: 'Part 1' })
  @IsString()
  @IsNotEmpty()
  namePart!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  order?: number;

  @ApiPropertyOptional({ type: ExtractedPassageDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ExtractedPassageDto)
  passage?: ExtractedPassageDto;

  @ApiProperty({ type: [ExtractedQuestionGroupDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtractedQuestionGroupDto)
  questionGroups!: ExtractedQuestionGroupDto[];

  @ApiPropertyOptional({ description: 'Part audio URL' })
  @IsOptional()
  @IsString()
  audioUrl?: string;
}

// ============================================================================
// Writing Task DTOs
// ============================================================================

export class ExtractedWritingTaskDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  idWritingTask?: string;

  @ApiProperty({ description: 'Task title/prompt' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ enum: ['TASK1', 'TASK2'] })
  @IsString()
  taskType!: 'TASK1' | 'TASK2';

  @ApiPropertyOptional({ description: 'Time limit in minutes' })
  @IsOptional()
  @IsNumber()
  timeLimit?: number;

  @ApiPropertyOptional({ description: 'Chart/graph image URL' })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({ description: 'Task instructions' })
  @IsOptional()
  @IsString()
  instructions?: string;
}

// ============================================================================
// Speaking Task DTOs
// ============================================================================

export class ExtractedSpeakingQuestionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  idSpeakingQuestion?: string;

  @ApiPropertyOptional({ description: 'Question topic', example: 'Hometown' })
  @IsOptional()
  @IsString()
  topic?: string;

  @ApiPropertyOptional({ description: 'Question prompt' })
  @IsOptional()
  @IsString()
  prompt?: string;

  @ApiPropertyOptional({ description: 'Cue card bullet points' })
  @IsOptional()
  @IsArray()
  subPrompts?: string[];

  @ApiPropertyOptional({ description: 'Preparation time in seconds' })
  @IsOptional()
  @IsNumber()
  preparationTime?: number;

  @ApiPropertyOptional({ description: 'Speaking time in seconds' })
  @IsOptional()
  @IsNumber()
  speakingTime?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  order?: number;
}

export class ExtractedSpeakingTaskDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  idSpeakingTask?: string;

  @ApiProperty({ description: 'Task title' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ enum: ['PART1', 'PART2', 'PART3'] })
  @IsString()
  part!: 'PART1' | 'PART2' | 'PART3';

  @ApiProperty({ type: [ExtractedSpeakingQuestionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtractedSpeakingQuestionDto)
  questions!: ExtractedSpeakingQuestionDto[];
}

// ============================================================================
// Root Extraction Result DTO
// ============================================================================

export class ExtractedRawDataDto {
  @ApiPropertyOptional({ description: 'Test title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ enum: ['Low', 'Mid', 'High', 'Great'] })
  @IsOptional()
  @IsString()
  level?: 'Low' | 'Mid' | 'High' | 'Great';

  @ApiPropertyOptional({ type: [ExtractedPartDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtractedPartDto)
  parts?: ExtractedPartDto[];

  @ApiPropertyOptional({ type: [ExtractedWritingTaskDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtractedWritingTaskDto)
  writingTasks?: ExtractedWritingTaskDto[];

  @ApiPropertyOptional({ type: [ExtractedSpeakingTaskDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtractedSpeakingTaskDto)
  speakingTasks?: ExtractedSpeakingTaskDto[];
}

export class ExtractionResultDto {
  @ApiProperty({ description: 'Session ID for tracking' })
  @IsString()
  @IsNotEmpty()
  idSession!: string;

  @ApiProperty({ type: ExtractedRawDataDto })
  @ValidateNested()
  @Type(() => ExtractedRawDataDto)
  rawData!: ExtractedRawDataDto;

  @ApiProperty({
    enum: ['PENDING', 'PROCESSING', 'READY_FOR_VERIFICATION', 'NEEDS_MANUAL_ENTRY', 'READY_FOR_REVIEW', 'REVIEWED', 'APPROVED', 'DISCARDED'],
  })
  @IsString()
  status!: string;

  @ApiProperty({ description: 'Extraction confidence score', example: 0.85 })
  @IsNumber()
  confidence!: number;

  @ApiPropertyOptional({ description: 'Extraction warnings' })
  @IsOptional()
  @IsArray()
  warnings?: string[];

  @ApiPropertyOptional({ description: 'Raw PDF URL (Cloudinary)' })
  @IsOptional()
  @IsString()
  rawPdfUrl?: string;

  @ApiPropertyOptional({ description: 'Creation timestamp' })
  @IsOptional()
  @IsString()
  createdAt?: string;
}

// ============================================================================
// AI Verification Result DTO
// ============================================================================

export class VerificationChangeDto {
  @ApiProperty({ description: 'Field path that changed' })
  @IsString()
  field!: string;

  @ApiProperty({ description: 'Original value' })
  @IsString()
  before!: string;

  @ApiProperty({ description: 'New value from AI' })
  @IsString()
  after!: string;

  @ApiProperty({ description: 'AI confidence in this change' })
  @IsNumber()
  confidence!: number;
}

export class VerificationResultDto {
  @ApiProperty()
  @IsString()
  idSession!: string;

  @ApiProperty({ type: ExtractedRawDataDto })
  @ValidateNested()
  @Type(() => ExtractedRawDataDto)
  verifiedData!: ExtractedRawDataDto;

  @ApiProperty({ type: [VerificationChangeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VerificationChangeDto)
  changes!: VerificationChangeDto[];

  @ApiProperty()
  @IsString()
  status!: string;
}

// ============================================================================
// Session Update DTO
// ============================================================================

export class UpdateSessionDto {
  @ApiPropertyOptional({ type: ExtractedRawDataDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ExtractedRawDataDto)
  data?: ExtractedRawDataDto;

  @ApiPropertyOptional({
    enum: ['PENDING', 'PROCESSING', 'READY_FOR_VERIFICATION', 'NEEDS_MANUAL_ENTRY', 'READY_FOR_REVIEW', 'REVIEWED', 'PARTIAL', 'APPROVED', 'DISCARDED'],
  })
  @IsOptional()
  @IsString()
  status?: string;
}

// ============================================================================
// Save Result DTO
// ============================================================================

export class SaveResultDto {
  @ApiProperty({ description: 'Created test ID' })
  @IsString()
  idTest!: string;

  @ApiProperty()
  @IsString()
  message!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  partsCreated?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  questionsCreated?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  writingTasksCreated?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  speakingTasksCreated?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  speakingQuestionsCreated?: number;
}

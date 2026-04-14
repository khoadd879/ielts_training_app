import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from '@nestjs/cache-manager';
import { Prisma, QuestionType } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { CloudinaryService } from '../../../cloudinary/cloudinary.service';
import { DatabaseService } from '../../../database/database.service';
import { TestType, UploadPdfDto } from '../dto/upload-pdf.dto';
import {
  ExtractionResultDto,
  ExtractedRawDataDto,
  SaveResultDto,
  UpdateSessionDto,
  VerificationChangeDto,
} from '../dto/extraction-result.dto';
import { PdfParserService } from './pdf-parser.service';
import { ExtractedExamData, TextBlock, ParsedDocumentProfile } from './pdf-parser.service';
import { StructureAnalyzerService } from './structure-analyzer.service';
import { DoclingService } from './docling.service';

// In-memory session storage (replace with Redis in production)
interface ExtractionSession {
  idSession: string;
  idUser?: string;
  testType: TestType;
  rawPdfUrl?: string;
  sourceText?: string;
  rawData?: ExtractedRawDataDto;
  verifiedData?: ExtractedRawDataDto;
  status:
    | 'PENDING'
    | 'PROCESSING'
    | 'READY_FOR_VERIFICATION'
    | 'NEEDS_MANUAL_ENTRY'
    | 'READY_FOR_REVIEW'
    | 'REVIEWED'
    | 'APPROVED'
    | 'DISCARDED';
  confidence: number;
  warnings: string[];
  createdAt: Date;
  updatedAt: Date;
}

type ExtractedPart = NonNullable<ExtractedRawDataDto['parts']>[number];
type ExtractedPassage = NonNullable<ExtractedPart['passage']>;
type ExtractedQuestionGroup = ExtractedPart['questionGroups'][number];
type ExtractedQuestion = ExtractedQuestionGroup['questions'][number];
type ExtractedWritingTask = NonNullable<
  ExtractedRawDataDto['writingTasks']
>[number];
type ExtractedSpeakingTask = NonNullable<
  ExtractedRawDataDto['speakingTasks']
>[number];
type ExtractedSpeakingQuestion = ExtractedSpeakingTask['questions'][number];
type LooseRecord = Record<string, unknown>;

const QUESTION_TYPE_VALUES = new Set<string>(Object.values(QuestionType));
const WRITING_TASK_TYPES = new Set(['TASK1', 'TASK2']);
const SPEAKING_PART_TYPES = new Set(['PART1', 'PART2', 'PART3']);
const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

@Injectable()
export class PdfExamService {
  private readonly logger = new Logger(PdfExamService.name);
  private readonly groqApiUrl =
    'https://api.groq.com/openai/v1/chat/completions';
  private readonly groqModel = 'groq/compound';
  private readonly maxVerificationSourceChars = 50000;

  // Circuit breaker state
  private groqFailureCount = 0;
  private groqLastFailureTime = 0;
  private readonly GROQ_CIRCUIT_BREAKER_THRESHOLD = 5;
  private readonly GROQ_CIRCUIT_BREAKER_RESET_MS = 30000; // 30 seconds
  private readonly GROQ_REQUEST_TIMEOUT_MS = 30000; // 30 second timeout

  // Session storage - use Redis via cache manager
  private readonly sessions = new Map<string, ExtractionSession>();
  private readonly sessionTtlMs = 2 * 60 * 60 * 1000; // 2 hours
  private cacheManager: Cache | null = null;

  constructor(
    private readonly pdfParserService: PdfParserService,
    private readonly structureAnalyzerService: StructureAnalyzerService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
    private readonly doclingService: DoclingService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {
    this.cacheManager = cache as any;
  }

  /**
   * Upload PDF and start extraction
   */
  async uploadAndExtract(
    file: Express.Multer.File,
    dto: UploadPdfDto,
    idUser?: string,
  ): Promise<ExtractionResultDto> {
    const correlationId = uuidv4();
    const idSession = uuidv4();

    this.logger.log(
      `[${correlationId}] Starting PDF upload, session: ${idSession}`,
    );

    // Validate file
    this.validateFile(file);

    try {
      // Upload to Cloudinary
      this.logger.log(`[${correlationId}] Uploading to Cloudinary`);
      const uploadResult = await this.cloudinaryService.uploadFile(
        file,
        'pdf-exams',
        'raw',
      );
      const rawPdfUrl = uploadResult.secure_url;

      // Create session
      const session: ExtractionSession = {
        idSession,
        idUser,
        testType: dto.testType,
        rawPdfUrl,
        status: 'PROCESSING',
        confidence: 0,
        warnings: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.sessions.set(idSession, session);

      // Try Docling first for better parsing, fall back to pdfjs-dist
      let parsedData;
      this.logger.log(`[${correlationId}] Parsing PDF`);
      try {
        if (this.doclingService.isDoclingAvailable()) {
          this.logger.log(`[${correlationId}] Using Docling for PDF parsing`);
          const doclingResult = await this.doclingService.convertPdf(
            file.buffer,
            file.originalname || 'document.pdf',
          );

          // Convert Docling output to pdf-parser format
          parsedData = this.convertDoclingToParsedData(
            doclingResult,
            dto.testType,
          );
        } else {
          this.logger.log(`[${correlationId}] Docling unavailable, using pdfjs-dist`);
          parsedData = await this.pdfParserService.parsePdf(
            file.buffer,
            dto.testType,
          );
        }
      } catch (error) {
        // Fall back to pdfjs-dist if Docling fails
        this.logger.warn(
          `[${correlationId}] Docling failed, falling back to pdfjs-dist`,
          error,
        );
        parsedData = await this.pdfParserService.parsePdf(
          file.buffer,
          dto.testType,
        );
      }

      // Override title if provided
      if (dto.title) {
        parsedData.title = dto.title;
      }
      if (dto.level) {
        parsedData.level = dto.level;
      }

      session.sourceText = this.buildVerificationSource(parsedData.rawText);

      // Analyze structure
      this.logger.log(`[${correlationId}] Analyzing structure`);
      const analysisResult = await this.structureAnalyzerService.analyze(
        parsedData,
        dto.testType,
      );
      const combinedWarnings = [
        ...parsedData.warnings,
        ...analysisResult.warnings,
      ];

      const aiRefinement = await this.refineExtractionWithGroq({
        rawData: analysisResult.data,
        testType: dto.testType,
        sourceText: session.sourceText,
        rawPdfUrl,
      });

      // Update session
      session.rawData = analysisResult.data;
      session.verifiedData = aiRefinement.verifiedData;
      session.confidence = Math.max(
        analysisResult.confidence,
        aiRefinement.confidence,
      );
      session.warnings = [...combinedWarnings, ...aiRefinement.warnings];
      session.status = 'READY_FOR_REVIEW';
      session.updatedAt = new Date();
      this.sessions.set(idSession, session);

      this.logger.log(
        `[${correlationId}] Extraction complete, confidence: ${session.confidence}`,
      );

      return {
        idSession,
        rawData: session.verifiedData || analysisResult.data,
        status: session.status,
        confidence: session.confidence,
        warnings: session.warnings,
        rawPdfUrl,
        createdAt: session.createdAt.toISOString(),
      };
    } catch (error) {
      this.logger.error(`[${correlationId}] Upload failed`, error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to process PDF');
    }
  }

  /**
   * Get session status and data
   */
  async getSession(idSession: string): Promise<ExtractionResultDto> {
    const session = this.sessions.get(idSession);
    if (!session) {
      throw new NotFoundException(`Session ${idSession} not found`);
    }

    return {
      idSession: session.idSession,
      rawData: session.verifiedData ||
        session.rawData || { title: session.testType },
      status: session.status,
      confidence: session.confidence,
      warnings: session.warnings,
      rawPdfUrl: session.rawPdfUrl,
      createdAt: session.createdAt.toISOString(),
    };
  }

  /**
   * Update session data (manual edits)
   */
  async updateSession(
    idSession: string,
    dto: UpdateSessionDto,
  ): Promise<ExtractionResultDto> {
    const session = this.sessions.get(idSession);
    if (!session) {
      throw new NotFoundException(`Session ${idSession} not found`);
    }

    if (dto.data) {
      if (session.verifiedData) {
        session.verifiedData = dto.data;
      } else {
        session.rawData = dto.data;
      }
    }
    if (dto.status) {
      session.status = dto.status as ExtractionSession['status'];
    }
    session.updatedAt = new Date();
    this.sessions.set(idSession, session);

    return {
      idSession: session.idSession,
      rawData: session.verifiedData ||
        session.rawData || { title: session.testType },
      status: session.status,
      confidence: session.confidence,
      warnings: session.warnings,
      rawPdfUrl: session.rawPdfUrl,
      createdAt: session.createdAt.toISOString(),
    };
  }

  /**
   * Save to database
   */
  async saveSession(idSession: string, idUser: string): Promise<SaveResultDto> {
    const correlationId = uuidv4();
    const session = this.sessions.get(idSession);

    if (!session) {
      throw new NotFoundException(`Session ${idSession} not found`);
    }

    if (
      session.status !== 'READY_FOR_REVIEW' &&
      session.status !== 'REVIEWED'
    ) {
      throw new BadRequestException(
        `Session must be reviewed before saving. Current status: ${session.status}`,
      );
    }

    const dataToSave = session.verifiedData || session.rawData;
    if (!dataToSave) {
      throw new BadRequestException('No data to save');
    }

    this.logger.log(
      `[${correlationId}] Saving session ${idSession} to database`,
    );

    try {
      // Use Prisma transaction for atomic save
      const result = await this.databaseService.$transaction(
        async (tx) => {
          // Create test record
          const test = await tx.test.create({
            data: {
              idUser,
              title: dataToSave.title || `IELTS ${session.testType} Practice`,
              description: `Imported from PDF session ${idSession}`,
              testType: session.testType,
              level: dataToSave.level || 'Mid',
              duration:
                session.testType === TestType.WRITING
                  ? 3600
                  : session.testType === TestType.SPEAKING
                    ? 900
                    : 3600,
              numberQuestion: this.countQuestions(dataToSave),
            },
          });

          let partsCreated = 0;
          let questionsCreated = 0;
          let writingTasksCreated = 0;
          let speakingTasksCreated = 0;
          let speakingQuestionsCreated = 0;

          // Handle Reading/Listening
          if (dataToSave.parts && dataToSave.parts.length > 0) {
            for (const partData of dataToSave.parts) {
              const part = await tx.part.create({
                data: {
                  idTest: test.idTest,
                  namePart: partData.namePart,
                  order: partData.order || 1,
                  audioUrl: partData.audioUrl,
                },
              });
              partsCreated++;

              // Create passage if exists
              if (partData.passage) {
                await tx.passage.create({
                  data: {
                    idPart: part.idPart,
                    title: partData.passage.title,
                    content: partData.passage.content,
                    image: partData.passage.image,
                    description: partData.passage.description,
                    numberParagraph: partData.passage.numberParagraph || 0,
                  },
                });
              }

              // Create question groups and questions
              for (const groupData of partData.questionGroups) {
                const group = await tx.questionGroup.create({
                  data: {
                    idPart: part.idPart,
                    title: groupData.title,
                    instructions: groupData.instructions,
                    questionType: groupData.questionType || 'MULTIPLE_CHOICE',
                    order: groupData.order || 0,
                  },
                });

                for (const questionData of groupData.questions) {
                  await tx.question.create({
                    data: {
                      idQuestionGroup: group.idQuestionGroup,
                      idPart: part.idPart,
                      questionNumber: questionData.questionNumber,
                      content: questionData.content,
                      questionType:
                        questionData.questionType ||
                        groupData.questionType ||
                        'MULTIPLE_CHOICE',
                      metadata: (questionData.metadata ||
                        {}) as Prisma.InputJsonValue,
                      order: 0,
                    },
                  });
                  questionsCreated++;
                }
              }
            }
          }

          // Handle Writing
          if (dataToSave.writingTasks && dataToSave.writingTasks.length > 0) {
            for (const taskData of dataToSave.writingTasks) {
              await tx.writingTask.create({
                data: {
                  idTest: test.idTest,
                  title: taskData.title,
                  taskType: taskData.taskType,
                  timeLimit:
                    taskData.timeLimit ||
                    (taskData.taskType === 'TASK1' ? 1200 : 2400),
                  image: taskData.image,
                  instructions: taskData.instructions,
                },
              });
              writingTasksCreated++;
            }
          }

          // Handle Speaking
          if (dataToSave.speakingTasks && dataToSave.speakingTasks.length > 0) {
            for (const taskData of dataToSave.speakingTasks) {
              const speakingTask = await tx.speakingTask.create({
                data: {
                  idTest: test.idTest,
                  title: taskData.title,
                  part: taskData.part,
                },
              });
              speakingTasksCreated++;

              for (const questionData of taskData.questions) {
                await tx.speakingQuestion.create({
                  data: {
                    idSpeakingTask: speakingTask.idSpeakingTask,
                    topic: questionData.topic,
                    prompt: questionData.prompt,
                    subPrompts: questionData.subPrompts || [],
                    preparationTime: questionData.preparationTime || 0,
                    speakingTime: questionData.speakingTime || 120,
                    order: questionData.order || 0,
                  },
                });
                speakingQuestionsCreated++;
              }
            }
          }

          return { test, partsCreated, questionsCreated, writingTasksCreated, speakingTasksCreated, speakingQuestionsCreated };
        },
        {
          timeout: 30000, // 30 second timeout
        },
      );

      // Mark session as approved
      session.status = 'APPROVED';
      session.updatedAt = new Date();
      this.sessions.set(idSession, session);

      this.logger.log(`[${correlationId}] Save complete, test: ${result.test.idTest}`);

      return {
        idTest: result.test.idTest,
        message: 'Test saved successfully',
        partsCreated: result.partsCreated,
        questionsCreated: result.questionsCreated,
        writingTasksCreated: result.writingTasksCreated,
        speakingTasksCreated: result.speakingTasksCreated,
        speakingQuestionsCreated: result.speakingQuestionsCreated,
      };
    } catch (error) {
      this.logger.error(`[${correlationId}] Save failed`, error);
      throw new BadRequestException('Failed to save test');
    }
  }

  /**
   * Delete session
   */
  async deleteSession(idSession: string): Promise<void> {
    const session = this.sessions.get(idSession);
    if (!session) {
      throw new NotFoundException(`Session ${idSession} not found`);
    }

    session.status = 'DISCARDED';
    this.sessions.set(idSession, session);

    // Clean up after some time (in production, use scheduled cleanup)
    setTimeout(
      () => {
        this.sessions.delete(idSession);
      },
      60 * 60 * 1000,
    ); // Delete after 1 hour
  }

  /**
   * Validate uploaded file
   */
  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const allowedMimeTypes = ['application/pdf'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only PDF files are allowed');
    }

    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 20MB limit');
    }
  }

  /**
   * Count total questions in extracted data
   */
  private countQuestions(data: ExtractedRawDataDto): number {
    let count = 0;

    if (data.parts) {
      for (const part of data.parts) {
        for (const group of part.questionGroups) {
          count += group.questions.length;
        }
      }
    }

    if (data.speakingTasks) {
      for (const task of data.speakingTasks) {
        count += task.questions.length;
      }
    }

    return count || 1; // Minimum 1 question
  }

  private async refineExtractionWithGroq(params: {
    rawData: ExtractedRawDataDto;
    testType: TestType;
    sourceText?: string;
    rawPdfUrl?: string;
  }): Promise<{
    verifiedData: ExtractedRawDataDto;
    changes: VerificationChangeDto[];
    warnings: string[];
    confidence: number;
  }> {
    const { rawData, testType, sourceText, rawPdfUrl } = params;
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    if (!apiKey) {
      return {
        verifiedData: rawData,
        changes: [],
        warnings: ['AI refinement skipped: Missing GROQ_API_KEY'],
        confidence: 0,
      };
    }

    try {
      const refinement = await this.runGroqExtractionRefinement(
        rawData,
        testType,
        sourceText,
        rawPdfUrl,
      );

      return {
        ...refinement,
        warnings: refinement.warnings,
        confidence: refinement.confidence,
      };
    } catch (error) {
      this.logger.error('Groq refinement failed during extract', error);
      return {
        verifiedData: rawData,
        changes: [],
        warnings: ['AI refinement failed, falling back to parser output'],
        confidence: 0,
      };
    }
  }

  private async runGroqExtractionRefinement(
    rawData: ExtractedRawDataDto,
    testType: TestType,
    sourceText?: string,
    rawPdfUrl?: string,
  ): Promise<{
    verifiedData: ExtractedRawDataDto;
    changes: VerificationChangeDto[];
    warnings: string[];
    confidence: number;
  }> {
    // Check circuit breaker
    if (this.isGroqCircuitOpen()) {
      throw new ServiceUnavailableException(
        'Groq service temporarily unavailable due to recent failures',
      );
    }

    const apiKey = this.configService.get<string>('GROQ_API_KEY')!;
    const requestBody = {
      model: this.groqModel,
      temperature: 0.1,
      seed: 42,
      max_completion_tokens: 4096,
      compound_custom: rawPdfUrl
        ? {
            tools: {
              enabled_tools: ['visit_website'],
            },
          }
        : undefined,
      messages: [
        {
          role: 'system',
          content: this.buildGroqSystemPrompt(testType, !!rawPdfUrl),
        },
        {
          role: 'user',
          content: this.buildGroqUserPrompt(
            rawData,
            testType,
            sourceText,
            rawPdfUrl,
          ),
        },
      ],
    };

    let lastError: Error | null = null;
    const delays = [1000, 2000, 4000]; // exponential backoff

    for (let attempt = 0; attempt <= 3; attempt++) {
      try {
        const response = await this.fetchWithTimeout(
          this.groqApiUrl,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
              'Groq-Model-Version': 'latest',
            },
            body: JSON.stringify(requestBody),
          },
          this.GROQ_REQUEST_TIMEOUT_MS,
        );

        const payload = (await response.json().catch(() => null)) as Record<
          string,
          any
        > | null;

        if (!response.ok) {
          const errorMessage =
            payload?.error?.message || payload?.message || 'Unknown Groq error';
          this.logger.error(`Groq verification failed: ${errorMessage}`);
          this.recordGroqFailure();
          throw new ServiceUnavailableException(
            `Groq verification failed: ${errorMessage}`,
          );
        }

        // Success - reset failure count
        this.groqFailureCount = 0;

        const content = payload?.choices?.[0]?.message?.content;
        if (!content || typeof content !== 'string') {
          throw new ServiceUnavailableException(
            'Groq verification returned an empty response',
          );
        }

        let parsedContent: Record<string, unknown>;
        try {
          parsedContent = this.extractJsonObject(content);
        } catch (error) {
          this.logger.error('Failed to parse Groq verification response', error);
          throw new ServiceUnavailableException(
            'Groq verification returned invalid JSON',
          );
        }

        const verifiedData = this.normalizeVerifiedData(
          parsedContent.verifiedData ?? parsedContent,
          rawData,
          testType,
        );

        const changes = this.normalizeVerificationChanges(
          parsedContent.changes,
          rawData,
          verifiedData,
        );

        const warnings: string[] = [];
        const executedTools = payload?.choices?.[0]?.message?.executed_tools;
        const usedVisitTool =
          Array.isArray(executedTools) &&
          executedTools.some(
            (tool: Record<string, unknown>) =>
              tool?.type === 'visit' || tool?.type === 'visit_website',
          );

        if (rawPdfUrl && !usedVisitTool) {
          warnings.push(
            'AI refinement did not confirm visiting the original PDF URL; it may have relied on extracted text only',
          );
        }

        return {
          verifiedData,
          changes,
          warnings,
          confidence: usedVisitTool ? 0.92 : 0.82,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // If this was our last attempt, record failure and rethrow
        if (attempt === 3) {
          this.recordGroqFailure();
          throw lastError;
        }

        // Check if error is non-retryable (circuit open, validation error, etc.)
        if (
          error instanceof ServiceUnavailableException &&
          lastError.message.includes('circuit')
        ) {
          throw lastError;
        }

        // Wait before retry
        await this.sleep(delays[attempt] || 4000);
      }
    }

    // Should never reach here, but TypeScript needs it
    this.recordGroqFailure();
    throw lastError || new Error('Groq extraction failed');
  }

  private isGroqCircuitOpen(): boolean {
    if (this.groqFailureCount < this.GROQ_CIRCUIT_BREAKER_THRESHOLD) {
      return false;
    }

    const now = Date.now();
    if (now - this.groqLastFailureTime > this.GROQ_CIRCUIT_BREAKER_RESET_MS) {
      // Reset circuit - allow request to try again (half-open state)
      this.groqFailureCount = 0;
      return false;
    }

    return true;
  }

  private recordGroqFailure(): void {
    this.groqFailureCount++;
    this.groqLastFailureTime = Date.now();
  }

  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeoutMs: number,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private buildGroqSystemPrompt(
    testType: TestType,
    hasPdfUrl: boolean,
  ): string {
    return [
      'You are an IELTS PDF extraction normalizer.',
      'Return one valid JSON object only. No markdown fences. No commentary.',
      `Target test type: ${testType}. Never convert it into another test type.`,
      hasPdfUrl
        ? 'If a PDF URL is provided and accessible, treat it as the highest-priority source.'
        : 'No PDF URL is available, so rely on parser output and extracted text.',
      'Preserve parser output unless the PDF clearly proves it is wrong.',
      'Never invent missing questions, options, passages, images, audio URLs, or answer keys.',
      'Use only supported application fields. Do not add extra keys.',
      'questionType and metadata.type must match whenever metadata exists.',
      'For unknown answer keys, keep the schema shape but leave answer-bearing fields empty or null instead of guessing.',
      'Return exactly these top-level keys: verifiedData, changes.',
      'Each change item must contain: field, before, after, confidence.',
    ].join(' ');
  }

  private buildGroqUserPrompt(
    rawData: ExtractedRawDataDto,
    testType: TestType,
    sourceText?: string,
    rawPdfUrl?: string,
  ): string {
    const sourceSection = sourceText?.trim()
      ? sourceText
      : 'No PDF source text is available. Only do conservative cleanup.';

    const pdfSection = rawPdfUrl
      ? `Original PDF URL: ${rawPdfUrl}
Visit this URL and inspect the original PDF if you can access it. Use it to confirm structure and fix parser mistakes.`
      : 'Original PDF URL: not available.';

    return [
      '### Role',
      'You refine raw IELTS extraction into the application schema used by the backend.',
      '',
      '### Instructions',
      '1. Read the parser JSON first to understand the existing structure.',
      '2. If the PDF URL is accessible, inspect the original file and use it to correct parser mistakes.',
      '3. Keep array order stable unless the PDF clearly shows a different order.',
      '4. Do not hallucinate answer keys, image URLs, audio URLs, or missing questions.',
      '5. Do not add unsupported metadata fields such as free-form helper notes.',
      '6. Return one JSON object only with keys verifiedData and changes.',
      '',
      '### Output Contract',
      this.buildGroqRootSchemaPrompt(testType),
      '',
      '### Metadata Contract',
      this.buildGroqMetadataSchemaPrompt(testType),
      '',
      '### Normalization Rules',
      this.buildGroqNormalizationRules(testType),
      '',
      '### Source PDF',
      pdfSection,
      '',
      '### Parser Output JSON',
      JSON.stringify(rawData, null, 2),
      '',
      '### Extracted PDF Text',
      sourceSection,
      '',
      '### Required Output Shape',
      '{"verifiedData": { ... }, "changes": [{"field": "verifiedData.path", "before": "...", "after": "...", "confidence": 0.0}]}',
    ].join('\n');
  }

  private buildGroqRootSchemaPrompt(testType: TestType): string {
    switch (testType) {
      case TestType.READING:
      case TestType.LISTENING:
        return [
          'verifiedData must be:',
          '{',
          '  "title": string,',
          '  "level": "Low" | "Mid" | "High" | "Great",',
          '  "parts": [',
          '    {',
          '      "namePart": string,',
          '      "order": number,',
          '      "passage"?: {',
          '        "title": string,',
          '        "content": string,',
          '        "image"?: string,',
          '        "description"?: string,',
          '        "numberParagraph"?: number',
          '      },',
          '      "questionGroups": [',
          '        {',
          '          "title": string,',
          '          "instructions"?: string,',
          '          "questionType": QuestionType,',
          '          "order"?: number,',
          '          "questions": ExtractedQuestion[]',
          '        }',
          '      ],',
          '      "audioUrl"?: string',
          '    }',
          '  ]',
          '}',
        ].join('\n');
      case TestType.WRITING:
        return [
          'verifiedData must be:',
          '{',
          '  "title": string,',
          '  "level": "Low" | "Mid" | "High" | "Great",',
          '  "writingTasks": [',
          '    {',
          '      "title": string,',
          '      "taskType": "TASK1" | "TASK2",',
          '      "timeLimit"?: number,',
          '      "image"?: string,',
          '      "instructions"?: string',
          '    }',
          '  ]',
          '}',
        ].join('\n');
      case TestType.SPEAKING:
        return [
          'verifiedData must be:',
          '{',
          '  "title": string,',
          '  "level": "Low" | "Mid" | "High" | "Great",',
          '  "speakingTasks": [',
          '    {',
          '      "title": string,',
          '      "part": "PART1" | "PART2" | "PART3",',
          '      "questions": [',
          '        {',
          '          "topic"?: string,',
          '          "prompt"?: string,',
          '          "subPrompts"?: string[],',
          '          "preparationTime"?: number,',
          '          "speakingTime"?: number,',
          '          "order"?: number',
          '        }',
          '      ]',
          '    }',
          '  ]',
          '}',
        ].join('\n');
      default:
        return 'verifiedData must follow the existing parser output shape exactly.';
    }
  }

  private buildGroqMetadataSchemaPrompt(testType: TestType): string {
    if (testType === TestType.WRITING || testType === TestType.SPEAKING) {
      return 'No question metadata section is needed for this test type.';
    }

    return [
      'Each ExtractedQuestion must contain:',
      '{ "questionNumber": number, "content": string, "questionType"?: QuestionType, "metadata"?: object }',
      '',
      'Supported metadata shapes:',
      'MULTIPLE_CHOICE => { "type":"MULTIPLE_CHOICE", "options":[{"label":string,"text":string}], "correctOptionIndexes": [], "isMultiSelect": boolean }',
      'TRUE_FALSE_NOT_GIVEN => { "type":"TRUE_FALSE_NOT_GIVEN", "statement": string, "correctAnswer": null }',
      'YES_NO_NOT_GIVEN => { "type":"YES_NO_NOT_GIVEN", "statement": string, "correctAnswer": null }',
      'MATCHING_HEADING => { "type":"MATCHING_HEADING", "headings":[{"label":string,"text":string}], "paragraphRef": string, "correctHeadingIndex": null }',
      'MATCHING_INFORMATION => { "type":"MATCHING_INFORMATION", "statement": string, "paragraphLabels":[string], "correctParagraph": null }',
      'MATCHING_FEATURES => { "type":"MATCHING_FEATURES", "statement": string, "features":[{"label":string,"text":string}], "correctFeatureLabel": null }',
      'MATCHING_SENTENCE_ENDINGS => { "type":"MATCHING_SENTENCE_ENDINGS", "sentenceStem": string, "endings":[{"label":string,"text":string}], "correctEndingLabel": null }',
      'SENTENCE_COMPLETION => { "type":"SENTENCE_COMPLETION", "sentenceWithBlank": string, "maxWords": number, "correctAnswers": [] }',
      'SUMMARY_COMPLETION => { "type":"SUMMARY_COMPLETION", "blankLabel": string, "maxWords": number, "hasWordBank": boolean, "wordBank"?: [{"id":string,"text":string}], "correctAnswers": [], "fullParagraph"?: string }',
      'NOTE_COMPLETION => { "type":"NOTE_COMPLETION", "noteContext": string, "maxWords": number, "correctAnswers": [], "fullNoteText"?: string }',
      'TABLE_COMPLETION => { "type":"TABLE_COMPLETION", "rowIndex": number, "columnIndex": number, "maxWords": number, "correctAnswers": [] }',
      'FLOW_CHART_COMPLETION => { "type":"FLOW_CHART_COMPLETION", "stepLabel": string, "maxWords": number, "hasWordBank": boolean, "wordBank"?: [{"id":string,"text":string}], "correctAnswers": [], "fullFlowText"?: string }',
      'SHORT_ANSWER => { "type":"SHORT_ANSWER", "maxWords": number, "correctAnswers": [] }',
      'Avoid DIAGRAM_LABELING unless the source truly provides a usable image URL and point labels.',
      'Do not add unsupported keys inside metadata.',
    ].join('\n');
  }

  private buildGroqNormalizationRules(testType: TestType): string {
    const commonRules = [
      '- Keep title/level if parser values already look correct.',
      '- Keep id fields if they already exist; do not invent new ids.',
      '- Omit sections unrelated to the current testType.',
      '- Keep question numbering exactly as shown in the PDF.',
      '- Preserve [number] placeholders for completion tasks.',
      '- group.questionType should match the dominant type of its questions.',
      '- question.questionType should match metadata.type if metadata exists.',
      '- Use empty arrays for unknown answer lists and null for unknown singular answer keys.',
      '- If the parser already extracted passage content well, do not rewrite it stylistically.',
      '- Keep changes concise and only include actual field-level corrections.',
    ];

    if (testType === TestType.READING || testType === TestType.LISTENING) {
      commonRules.push(
        '- Root output must contain parts and must not contain writingTasks or speakingTasks.',
        '- For Listening, prefer Section labels if the PDF uses Section; for Reading, prefer Part labels if the PDF uses Part.',
        '- Put IELTS instruction text into questionGroups[].instructions, not inside metadata.',
        '- For multiple choice, each question should contain only its own option set.',
      );
    }

    if (testType === TestType.WRITING) {
      commonRules.push(
        '- Root output must contain writingTasks only.',
        '- Keep taskType strictly TASK1 or TASK2.',
      );
    }

    if (testType === TestType.SPEAKING) {
      commonRules.push(
        '- Root output must contain speakingTasks only.',
        '- Keep speaking part strictly PART1, PART2, or PART3.',
      );
    }

    return commonRules.join('\n');
  }

  private extractJsonObject(content: string): Record<string, unknown> {
    // Try multiple extraction strategies
    const strategies = [
      // Strategy 1: Direct JSON parse (clean content)
      () => {
        const cleaned = content
          .replace(/```json\n?/gi, '')
          .replace(/```\n?/g, '')
          .trim();
        return JSON.parse(cleaned) as Record<string, unknown>;
      },
      // Strategy 2: Extract from markdown code block
      () => {
        const match = content.match(/```json\s*(\{[\s\S]*?\})\s*```/i);
        if (match) {
          return JSON.parse(match[1]) as Record<string, unknown>;
        }
        return null;
      },
      // Strategy 3: Find first JSON object using brace matching
      () => {
        const cleaned = content
          .replace(/```json/gi, '')
          .replace(/```/g, '')
          .trim();

        // Find the outermost braces using a stack approach
        const firstBrace = cleaned.indexOf('{');
        if (firstBrace === -1) {
          return null;
        }

        let braceCount = 0;
        let start = firstBrace;
        let end = cleaned.length;

        for (let i = firstBrace; i < cleaned.length; i++) {
          if (cleaned[i] === '{') {
            if (braceCount === 0) start = i;
            braceCount++;
          } else if (cleaned[i] === '}') {
            braceCount--;
            if (braceCount === 0) {
              end = i + 1;
              break;
            }
          }
        }

        if (braceCount === 0 && end > start) {
          return JSON.parse(cleaned.slice(start, end)) as Record<string, unknown>;
        }
        return null;
      },
      // Strategy 4: Extract top-level verifiedData field using regex
      () => {
        const verifiedDataMatch = content.match(
          /"verifiedData"\s*:\s*(\{[\s\S]*?\})(?:,|\s*\}|$)/,
        );
        if (verifiedDataMatch) {
          // Try to parse what's around verifiedData
          const start = content.indexOf('"verifiedData"');
          const afterVerified = content.slice(start);
          const braceMatch = afterVerified.match(/^\"verifiedData\"\s*:\s*(\{)/);
          if (braceMatch) {
            const idx = start + afterVerified.indexOf('{');
            let braceCount = 0;
            for (let i = 0; i < afterVerified.length; i++) {
              if (afterVerified[i] === '{') braceCount++;
              else if (afterVerified[i] === '}') {
                braceCount--;
                if (braceCount === 0) {
                  return JSON.parse(
                    content.slice(idx, idx + i + 1),
                  ) as Record<string, unknown>;
                }
              }
            }
          }
        }
        return null;
      },
    ];

    const errors: string[] = [];
    for (const strategy of strategies) {
      try {
        const result = strategy();
        if (result && typeof result === 'object') {
          return result;
        }
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
      }
    }

    // Last resort: try to find any JSON object with verifiedData
    try {
      const verifiedDataMatch = content.match(
        /\{[\s\S]*?"verifiedData"[\s\S]*?\}/m,
      );
      if (verifiedDataMatch) {
        return JSON.parse(verifiedDataMatch[0]) as Record<string, unknown>;
      }
    } catch {
      // Ignore
    }

    this.logger.error(
      `All JSON extraction strategies failed. Errors: ${errors.join('; ')}`,
    );
    throw new Error('No valid JSON object found in content');
  }

  private buildVerificationSource(rawText: string): string {
    const normalized = rawText.replace(/\s+\n/g, '\n').trim();
    if (normalized.length <= this.maxVerificationSourceChars) {
      return normalized;
    }

    const truncated = normalized.slice(0, this.maxVerificationSourceChars);
    return `${truncated}\n\n[TRUNCATED FOR VERIFICATION]`;
  }

  private normalizeVerifiedData(
    candidate: unknown,
    fallback: ExtractedRawDataDto,
    testType: TestType,
  ): ExtractedRawDataDto {
    const sanitizedFallback = this.sanitizeExtractedData(
      fallback,
      fallback,
      testType,
    );

    if (!candidate || typeof candidate !== 'object') {
      return sanitizedFallback;
    }

    return this.sanitizeExtractedData(
      candidate as Partial<ExtractedRawDataDto>,
      sanitizedFallback,
      testType,
    );
  }

  private sanitizeExtractedData(
    candidate: Partial<ExtractedRawDataDto> | undefined,
    fallback: ExtractedRawDataDto,
    testType: TestType,
  ): ExtractedRawDataDto {
    const sanitized: ExtractedRawDataDto = {};
    const title = this.pickNonEmptyString(candidate?.title, fallback.title);
    const candidateLevel = candidate?.level;
    const level = this.isValidLevel(candidateLevel)
      ? candidateLevel
      : fallback.level;

    if (title) {
      sanitized.title = title;
    }
    if (level) {
      sanitized.level = level;
    }

    if (testType === TestType.READING || testType === TestType.LISTENING) {
      const parts = this.sanitizeParts(
        candidate?.parts,
        fallback.parts,
        testType,
      );
      if (parts.length > 0) {
        sanitized.parts = parts;
      }
      return sanitized;
    }

    if (testType === TestType.WRITING) {
      const writingTasks = this.sanitizeWritingTasks(
        candidate?.writingTasks,
        fallback.writingTasks,
      );
      if (writingTasks.length > 0) {
        sanitized.writingTasks = writingTasks;
      }
      return sanitized;
    }

    if (testType === TestType.SPEAKING) {
      const speakingTasks = this.sanitizeSpeakingTasks(
        candidate?.speakingTasks,
        fallback.speakingTasks,
      );
      if (speakingTasks.length > 0) {
        sanitized.speakingTasks = speakingTasks;
      }
      return sanitized;
    }

    return sanitized;
  }

  private sanitizeParts(
    candidate: unknown,
    fallback: ExtractedRawDataDto['parts'] | undefined,
    testType: TestType,
  ): ExtractedPart[] {
    return this.sanitizeList(candidate, fallback, (item, fallbackItem, index) =>
      this.sanitizePart(item, fallbackItem, index, testType),
    );
  }

  private sanitizePart(
    candidate: unknown,
    fallback: ExtractedPart | undefined,
    index: number,
    testType: TestType,
  ): ExtractedPart | null {
    const raw = this.toRecord(candidate);
    if (!raw && !fallback) {
      return null;
    }

    const part: ExtractedPart = {
      namePart:
        this.pickNonEmptyString(raw?.namePart, fallback?.namePart) ||
        this.defaultPartName(testType, index),
      questionGroups: this.sanitizeQuestionGroups(
        raw?.questionGroups,
        fallback?.questionGroups,
      ),
      order: this.pickPositiveInt(raw?.order, fallback?.order, index + 1),
    };

    const idPart = this.pickNonEmptyString(raw?.idPart, fallback?.idPart);
    if (idPart) {
      part.idPart = idPart;
    }

    const passage = this.sanitizePassage(raw?.passage, fallback?.passage);
    if (passage) {
      part.passage = passage;
    }

    const audioUrl = this.pickNonEmptyString(raw?.audioUrl, fallback?.audioUrl);
    if (audioUrl) {
      part.audioUrl = audioUrl;
    }

    if (part.questionGroups.length === 0 && !part.passage) {
      return null;
    }

    return part;
  }

  private sanitizePassage(
    candidate: unknown,
    fallback: ExtractedPart['passage'] | undefined,
  ): ExtractedPassage | undefined {
    const raw = this.toRecord(candidate);
    if (!raw && !fallback) {
      return undefined;
    }

    const title = this.pickNonEmptyString(raw?.title, fallback?.title);
    const content = this.pickNonEmptyString(raw?.content, fallback?.content);

    if (!content) {
      return undefined;
    }

    const passage: ExtractedPassage = {
      title: title || 'Passage',
      content,
    };

    const image = this.pickNonEmptyString(raw?.image, fallback?.image);
    if (image) {
      passage.image = image;
    }

    const description = this.pickNonEmptyString(
      raw?.description,
      fallback?.description,
    );
    if (description) {
      passage.description = description;
    }

    const numberParagraph = this.pickPositiveInt(
      raw?.numberParagraph,
      fallback?.numberParagraph,
      this.countParagraphs(content),
    );
    if (numberParagraph) {
      passage.numberParagraph = numberParagraph;
    }

    return passage;
  }

  private sanitizeQuestionGroups(
    candidate: unknown,
    fallback: ExtractedPart['questionGroups'] | undefined,
  ): ExtractedQuestionGroup[] {
    return this.sanitizeList(candidate, fallback, (item, fallbackItem, index) =>
      this.sanitizeQuestionGroup(item, fallbackItem, index),
    );
  }

  private sanitizeQuestionGroup(
    candidate: unknown,
    fallback: ExtractedQuestionGroup | undefined,
    index: number,
  ): ExtractedQuestionGroup | null {
    const raw = this.toRecord(candidate);
    if (!raw && !fallback) {
      return null;
    }

    const rawInstructions = this.pickNonEmptyString(
      raw?.instructions,
      fallback?.instructions,
    );
    const fallbackType = this.resolveQuestionType(
      fallback?.questionType,
      this.extractMetadataType(fallback?.questions?.[0]?.metadata),
    );
    const hintedType = this.resolveQuestionType(
      raw?.questionType,
      fallbackType,
    );

    const questions = this.sanitizeQuestions(
      raw?.questions,
      fallback?.questions,
      rawInstructions,
      hintedType,
    );
    if (questions.length === 0) {
      return null;
    }

    const dominantType = this.findDominantQuestionType(questions);
    const questionType =
      dominantType ||
      hintedType ||
      fallbackType ||
      QuestionType.MULTIPLE_CHOICE;

    const group: ExtractedQuestionGroup = {
      title:
        this.pickNonEmptyString(raw?.title, fallback?.title) ||
        this.buildQuestionRangeTitle(questions) ||
        `Questions ${index + 1}`,
      questionType,
      questions,
      order: this.pickNonNegativeInt(raw?.order, fallback?.order, index),
    };

    const idQuestionGroup = this.pickNonEmptyString(
      raw?.idQuestionGroup,
      fallback?.idQuestionGroup,
    );
    if (idQuestionGroup) {
      group.idQuestionGroup = idQuestionGroup;
    }

    if (rawInstructions) {
      group.instructions = rawInstructions;
    }

    return group;
  }

  private sanitizeQuestions(
    candidate: unknown,
    fallback: ExtractedQuestionGroup['questions'] | undefined,
    groupInstructions: string | undefined,
    groupType: QuestionType | undefined,
  ): ExtractedQuestion[] {
    return this.sanitizeList(candidate, fallback, (item, fallbackItem, index) =>
      this.sanitizeQuestion(
        item,
        fallbackItem,
        index,
        groupInstructions,
        groupType,
      ),
    );
  }

  private sanitizeQuestion(
    candidate: unknown,
    fallback: ExtractedQuestion | undefined,
    index: number,
    groupInstructions: string | undefined,
    groupType: QuestionType | undefined,
  ): ExtractedQuestion | null {
    const raw = this.toRecord(candidate);
    if (!raw && !fallback) {
      return null;
    }

    const fallbackType = this.resolveQuestionType(
      this.extractMetadataType(fallback?.metadata),
      fallback?.questionType,
      groupType,
    );
    const resolvedType =
      this.resolveQuestionType(
        this.extractMetadataType(raw?.metadata),
        raw?.questionType,
        fallbackType,
      ) || QuestionType.MULTIPLE_CHOICE;
    const questionNumber =
      this.pickPositiveInt(
        raw?.questionNumber,
        fallback?.questionNumber,
        index + 1,
      ) || index + 1;
    const content = this.buildQuestionContent(
      raw?.content,
      fallback?.content,
      raw?.metadata,
      fallback?.metadata,
      questionNumber,
    );
    if (!content) {
      return null;
    }

    const metadata = this.sanitizeQuestionMetadata(
      raw?.metadata,
      resolvedType,
      content,
      questionNumber,
      groupInstructions,
      fallback?.metadata,
    );
    const finalType =
      this.resolveQuestionType(
        this.extractMetadataType(metadata),
        resolvedType,
        fallbackType,
      ) || QuestionType.MULTIPLE_CHOICE;

    const question: ExtractedQuestion = {
      questionNumber,
      content,
      questionType: finalType,
    };

    const idQuestion = this.pickNonEmptyString(
      raw?.idQuestion,
      fallback?.idQuestion,
    );
    if (idQuestion) {
      question.idQuestion = idQuestion;
    }

    if (metadata) {
      question.metadata = metadata;
    }

    const confidence = this.pickConfidence(
      raw?.confidence,
      fallback?.confidence,
    );
    if (confidence !== undefined) {
      question.confidence = confidence;
    }

    const warnings = this.sanitizeStringArray(
      raw?.warnings,
      fallback?.warnings,
    );
    if (warnings.length > 0) {
      question.warnings = warnings;
    }

    return question;
  }

  private sanitizeQuestionMetadata(
    candidate: unknown,
    questionType: QuestionType,
    questionContent: string,
    questionNumber: number,
    groupInstructions: string | undefined,
    fallback: unknown,
  ): Record<string, unknown> | undefined {
    return (
      this.sanitizeQuestionMetadataShape(
        candidate,
        questionType,
        questionContent,
        questionNumber,
        groupInstructions,
      ) ||
      this.sanitizeQuestionMetadataShape(
        fallback,
        questionType,
        questionContent,
        questionNumber,
        groupInstructions,
      )
    );
  }

  private sanitizeQuestionMetadataShape(
    candidate: unknown,
    questionType: QuestionType,
    questionContent: string,
    questionNumber: number,
    groupInstructions: string | undefined,
  ): Record<string, unknown> | undefined {
    const raw = this.toRecord(candidate);
    if (!raw) {
      return undefined;
    }

    const inferredMaxWords = this.inferMaxWords(
      groupInstructions,
      questionContent,
    );

    switch (questionType) {
      case QuestionType.MULTIPLE_CHOICE: {
        const correctOptionIndexes = this.sanitizeNumberArray(
          raw.correctOptionIndexes,
        );
        return {
          type: QuestionType.MULTIPLE_CHOICE,
          options: this.sanitizeOptionList(raw.options),
          correctOptionIndexes,
          isMultiSelect:
            typeof raw.isMultiSelect === 'boolean'
              ? raw.isMultiSelect
              : this.inferMultiSelect(groupInstructions, correctOptionIndexes),
        };
      }
      case QuestionType.TRUE_FALSE_NOT_GIVEN:
        return {
          type: QuestionType.TRUE_FALSE_NOT_GIVEN,
          statement:
            this.pickNonEmptyString(raw.statement, questionContent) ||
            questionContent,
          correctAnswer: this.pickEnumValue(raw.correctAnswer, [
            'TRUE',
            'FALSE',
            'NOT_GIVEN',
          ]),
        };
      case QuestionType.YES_NO_NOT_GIVEN:
        return {
          type: QuestionType.YES_NO_NOT_GIVEN,
          statement:
            this.pickNonEmptyString(raw.statement, questionContent) ||
            questionContent,
          correctAnswer: this.pickEnumValue(raw.correctAnswer, [
            'YES',
            'NO',
            'NOT_GIVEN',
          ]),
        };
      case QuestionType.MATCHING_HEADING:
        return {
          type: QuestionType.MATCHING_HEADING,
          headings: this.sanitizeOptionList(raw.headings),
          paragraphRef:
            this.pickNonEmptyString(raw.paragraphRef) ||
            `Paragraph ${questionNumber}`,
          correctHeadingIndex:
            this.pickNonNegativeInt(raw.correctHeadingIndex) ?? null,
        };
      case QuestionType.MATCHING_INFORMATION:
        return {
          type: QuestionType.MATCHING_INFORMATION,
          statement:
            this.pickNonEmptyString(raw.statement, questionContent) ||
            questionContent,
          paragraphLabels: this.sanitizeStringArray(raw.paragraphLabels),
          correctParagraph:
            this.pickNonEmptyString(raw.correctParagraph) || null,
        };
      case QuestionType.MATCHING_FEATURES:
        return {
          type: QuestionType.MATCHING_FEATURES,
          statement:
            this.pickNonEmptyString(raw.statement, questionContent) ||
            questionContent,
          features: this.sanitizeOptionList(raw.features),
          correctFeatureLabel:
            this.pickNonEmptyString(raw.correctFeatureLabel) || null,
        };
      case QuestionType.MATCHING_SENTENCE_ENDINGS:
        return {
          type: QuestionType.MATCHING_SENTENCE_ENDINGS,
          sentenceStem:
            this.pickNonEmptyString(raw.sentenceStem, questionContent) ||
            questionContent,
          endings: this.sanitizeOptionList(raw.endings),
          correctEndingLabel:
            this.pickNonEmptyString(raw.correctEndingLabel) || null,
        };
      case QuestionType.SENTENCE_COMPLETION:
        return {
          type: QuestionType.SENTENCE_COMPLETION,
          sentenceWithBlank:
            this.pickNonEmptyString(raw.sentenceWithBlank, questionContent) ||
            questionContent,
          maxWords: this.pickPositiveInt(raw.maxWords, inferredMaxWords) || 1,
          correctAnswers: this.sanitizeStringArray(raw.correctAnswers),
        };
      case QuestionType.SUMMARY_COMPLETION:
        return {
          type: QuestionType.SUMMARY_COMPLETION,
          blankLabel:
            this.pickNonEmptyString(raw.blankLabel) ||
            String(
              this.extractBracketedQuestionNumber(questionContent) ??
                questionNumber,
            ),
          maxWords: this.pickPositiveInt(raw.maxWords, inferredMaxWords) || 1,
          hasWordBank: this.inferHasWordBank(raw, groupInstructions),
          wordBank: this.sanitizeWordBankList(raw.wordBank),
          correctAnswers: this.sanitizeStringArray(raw.correctAnswers),
          fullParagraph: this.pickNonEmptyString(raw.fullParagraph),
        };
      case QuestionType.NOTE_COMPLETION:
        return {
          type: QuestionType.NOTE_COMPLETION,
          noteContext:
            this.pickNonEmptyString(raw.noteContext, questionContent) ||
            questionContent,
          maxWords: this.pickPositiveInt(raw.maxWords, inferredMaxWords) || 1,
          correctAnswers: this.sanitizeStringArray(raw.correctAnswers),
          fullNoteText: this.pickNonEmptyString(raw.fullNoteText),
        };
      case QuestionType.TABLE_COMPLETION:
        return {
          type: QuestionType.TABLE_COMPLETION,
          rowIndex: this.pickNonNegativeInt(raw.rowIndex, 0) || 0,
          columnIndex: this.pickNonNegativeInt(raw.columnIndex, 0) || 0,
          maxWords: this.pickPositiveInt(raw.maxWords, inferredMaxWords) || 1,
          correctAnswers: this.sanitizeStringArray(raw.correctAnswers),
        };
      case QuestionType.FLOW_CHART_COMPLETION:
        return {
          type: QuestionType.FLOW_CHART_COMPLETION,
          stepLabel:
            this.pickNonEmptyString(raw.stepLabel, questionContent) ||
            questionContent,
          maxWords: this.pickPositiveInt(raw.maxWords, inferredMaxWords) || 1,
          hasWordBank: this.inferHasWordBank(raw, groupInstructions),
          wordBank: this.sanitizeWordBankList(raw.wordBank),
          correctAnswers: this.sanitizeStringArray(raw.correctAnswers),
          fullFlowText: this.pickNonEmptyString(raw.fullFlowText),
        };
      case QuestionType.DIAGRAM_LABELING: {
        const imageUrl = this.pickNonEmptyString(raw.imageUrl);
        const pointLabel = this.pickNonEmptyString(raw.pointLabel);
        const labelCoordinate = this.sanitizeCoordinate(raw.labelCoordinate);

        if (!imageUrl || !pointLabel || !labelCoordinate) {
          return undefined;
        }

        return {
          type: QuestionType.DIAGRAM_LABELING,
          imageUrl,
          labelCoordinate,
          pointLabel,
          hasWordBank: this.inferHasWordBank(raw, groupInstructions),
          wordBank: this.sanitizeWordBankList(raw.wordBank),
          correctAnswers: this.sanitizeStringArray(raw.correctAnswers),
        };
      }
      case QuestionType.SHORT_ANSWER:
        return {
          type: QuestionType.SHORT_ANSWER,
          maxWords: this.pickPositiveInt(raw.maxWords, inferredMaxWords) || 1,
          correctAnswers: this.sanitizeStringArray(raw.correctAnswers),
        };
      default:
        return undefined;
    }
  }

  private sanitizeWritingTasks(
    candidate: unknown,
    fallback: ExtractedRawDataDto['writingTasks'] | undefined,
  ): ExtractedWritingTask[] {
    return this.sanitizeList(candidate, fallback, (item, fallbackItem, index) =>
      this.sanitizeWritingTask(item, fallbackItem, index),
    );
  }

  private sanitizeWritingTask(
    candidate: unknown,
    fallback: ExtractedWritingTask | undefined,
    index: number,
  ): ExtractedWritingTask | null {
    const raw = this.toRecord(candidate);
    if (!raw && !fallback) {
      return null;
    }

    const taskType =
      this.extractWritingTaskType(raw?.taskType) ||
      this.extractWritingTaskType(fallback?.taskType) ||
      this.inferWritingTaskType(
        raw?.title,
        raw?.instructions,
        fallback?.title,
      ) ||
      (index === 0 ? 'TASK1' : 'TASK2');

    const title =
      this.pickNonEmptyString(raw?.title, fallback?.title) ||
      `IELTS Writing ${taskType}`;

    const task: ExtractedWritingTask = {
      title,
      taskType,
    };

    const idWritingTask = this.pickNonEmptyString(
      raw?.idWritingTask,
      fallback?.idWritingTask,
    );
    if (idWritingTask) {
      task.idWritingTask = idWritingTask;
    }

    const timeLimit = this.pickPositiveInt(raw?.timeLimit, fallback?.timeLimit);
    if (timeLimit) {
      task.timeLimit = timeLimit;
    }

    const image = this.pickNonEmptyString(raw?.image, fallback?.image);
    if (image) {
      task.image = image;
    }

    const instructions = this.pickNonEmptyString(
      raw?.instructions,
      fallback?.instructions,
    );
    if (instructions) {
      task.instructions = instructions;
    }

    return task;
  }

  private sanitizeSpeakingTasks(
    candidate: unknown,
    fallback: ExtractedRawDataDto['speakingTasks'] | undefined,
  ): ExtractedSpeakingTask[] {
    return this.sanitizeList(candidate, fallback, (item, fallbackItem, index) =>
      this.sanitizeSpeakingTask(item, fallbackItem, index),
    );
  }

  private sanitizeSpeakingTask(
    candidate: unknown,
    fallback: ExtractedSpeakingTask | undefined,
    index: number,
  ): ExtractedSpeakingTask | null {
    const raw = this.toRecord(candidate);
    if (!raw && !fallback) {
      return null;
    }

    const part =
      this.extractSpeakingPart(raw?.part) ||
      this.extractSpeakingPart(fallback?.part) ||
      this.inferSpeakingPart(raw?.title, fallback?.title) ||
      (['PART1', 'PART2', 'PART3'][index] as 'PART1' | 'PART2' | 'PART3');
    const questions = this.sanitizeSpeakingQuestions(
      raw?.questions,
      fallback?.questions,
    );

    if (questions.length === 0) {
      return null;
    }

    const task: ExtractedSpeakingTask = {
      title:
        this.pickNonEmptyString(raw?.title, fallback?.title) ||
        `Speaking ${part.replace('PART', 'Part ')}`,
      part,
      questions,
    };

    const idSpeakingTask = this.pickNonEmptyString(
      raw?.idSpeakingTask,
      fallback?.idSpeakingTask,
    );
    if (idSpeakingTask) {
      task.idSpeakingTask = idSpeakingTask;
    }

    return task;
  }

  private sanitizeSpeakingQuestions(
    candidate: unknown,
    fallback: ExtractedSpeakingTask['questions'] | undefined,
  ): ExtractedSpeakingQuestion[] {
    return this.sanitizeList(candidate, fallback, (item, fallbackItem, index) =>
      this.sanitizeSpeakingQuestion(item, fallbackItem, index),
    );
  }

  private sanitizeSpeakingQuestion(
    candidate: unknown,
    fallback: ExtractedSpeakingQuestion | undefined,
    index: number,
  ): ExtractedSpeakingQuestion | null {
    const raw = this.toRecord(candidate);
    if (!raw && !fallback) {
      return null;
    }

    const topic = this.pickNonEmptyString(raw?.topic, fallback?.topic);
    const prompt = this.pickNonEmptyString(raw?.prompt, fallback?.prompt);
    const subPrompts = this.sanitizeStringArray(
      raw?.subPrompts,
      fallback?.subPrompts,
    );

    if (!topic && !prompt && subPrompts.length === 0) {
      return null;
    }

    const question: ExtractedSpeakingQuestion = {
      order: this.pickNonNegativeInt(raw?.order, fallback?.order, index),
    };

    const idSpeakingQuestion = this.pickNonEmptyString(
      raw?.idSpeakingQuestion,
      fallback?.idSpeakingQuestion,
    );
    if (idSpeakingQuestion) {
      question.idSpeakingQuestion = idSpeakingQuestion;
    }
    if (topic) {
      question.topic = topic;
    }
    if (prompt) {
      question.prompt = prompt;
    }
    if (subPrompts.length > 0) {
      question.subPrompts = subPrompts;
    }

    const preparationTime = this.pickPositiveInt(
      raw?.preparationTime,
      fallback?.preparationTime,
    );
    if (preparationTime) {
      question.preparationTime = preparationTime;
    }

    const speakingTime = this.pickPositiveInt(
      raw?.speakingTime,
      fallback?.speakingTime,
    );
    if (speakingTime) {
      question.speakingTime = speakingTime;
    }

    return question;
  }

  private sanitizeList<T>(
    candidate: unknown,
    fallback: T[] | undefined,
    sanitizer: (
      item: unknown,
      fallbackItem: T | undefined,
      index: number,
    ) => T | null,
  ): T[] {
    const fallbackItems = Array.isArray(fallback) ? fallback : [];
    const sourceItems =
      Array.isArray(candidate) && candidate.length > 0
        ? candidate
        : fallbackItems;

    const sanitized = sourceItems
      .map(
        (item, index) =>
          sanitizer(item, fallbackItems[index], index) ||
          (fallbackItems[index]
            ? sanitizer(fallbackItems[index], fallbackItems[index], index)
            : null),
      )
      .filter((item): item is T => item !== null);

    if (sanitized.length > 0) {
      return sanitized;
    }

    return fallbackItems
      .map((item, index) => sanitizer(item, item, index))
      .filter((item): item is T => item !== null);
  }

  private sanitizeOptionList(candidate: unknown): Array<{
    label: string;
    text: string;
  }> {
    if (!Array.isArray(candidate)) {
      return [];
    }

    return candidate
      .map((item) => {
        if (typeof item === 'string') {
          const match = item.trim().match(/^([A-Za-z0-9]+)[).:]?\s+(.+)$/);
          if (!match) {
            return null;
          }

          return {
            label: match[1].trim(),
            text: match[2].trim(),
          };
        }

        const raw = this.toRecord(item);
        const label = this.pickNonEmptyString(raw?.label);
        const text = this.pickNonEmptyString(raw?.text);
        if (!label || !text) {
          return null;
        }

        return { label, text };
      })
      .filter(
        (
          item,
        ): item is {
          label: string;
          text: string;
        } => item !== null,
      );
  }

  private sanitizeWordBankList(candidate: unknown):
    | Array<{
        id: string;
        text: string;
      }>
    | undefined {
    if (!Array.isArray(candidate)) {
      return undefined;
    }

    const items = candidate
      .map((item, index) => {
        if (typeof item === 'string' && item.trim()) {
          return {
            id: String(index + 1),
            text: item.trim(),
          };
        }

        const raw = this.toRecord(item);
        const text = this.pickNonEmptyString(raw?.text);
        if (!text) {
          return null;
        }

        return {
          id: this.pickNonEmptyString(raw?.id) || String(index + 1),
          text,
        };
      })
      .filter(
        (
          item,
        ): item is {
          id: string;
          text: string;
        } => item !== null,
      );

    return items.length > 0 ? items : undefined;
  }

  private sanitizeCoordinate(
    candidate: unknown,
  ): { x: number; y: number } | undefined {
    const raw = this.toRecord(candidate);
    if (!raw) {
      return undefined;
    }

    const x = this.coerceFiniteNumber(raw.x);
    const y = this.coerceFiniteNumber(raw.y);
    if (x === undefined || y === undefined) {
      return undefined;
    }

    return {
      x: Math.min(100, Math.max(0, x)),
      y: Math.min(100, Math.max(0, y)),
    };
  }

  private sanitizeNumberArray(candidate: unknown): number[] {
    if (!Array.isArray(candidate)) {
      return [];
    }

    return [
      ...new Set(
        candidate
          .map((value) => this.pickNonNegativeInt(value))
          .filter((value): value is number => value !== undefined),
      ),
    ];
  }

  private pickConfidence(...values: unknown[]): number | undefined {
    for (const value of values) {
      const numberValue = this.coerceFiniteNumber(value);
      if (numberValue !== undefined) {
        return Math.min(1, Math.max(0, numberValue));
      }
    }

    return undefined;
  }

  private buildQuestionContent(
    candidateContent: unknown,
    fallbackContent: unknown,
    candidateMetadata: unknown,
    fallbackMetadata: unknown,
    questionNumber: number,
  ): string {
    return (
      this.pickNonEmptyString(candidateContent, fallbackContent) ||
      this.extractMetadataText(candidateMetadata) ||
      this.extractMetadataText(fallbackMetadata) ||
      `Question ${questionNumber}`
    );
  }

  private extractMetadataText(candidate: unknown): string | undefined {
    const raw = this.toRecord(candidate);
    if (!raw) {
      return undefined;
    }

    return this.pickNonEmptyString(
      raw.statement,
      raw.sentenceStem,
      raw.sentenceWithBlank,
      raw.noteContext,
      raw.fullParagraph,
      raw.fullNoteText,
      raw.fullFlowText,
      raw.stepLabel,
      raw.pointLabel,
    );
  }

  private resolveQuestionType(...values: unknown[]): QuestionType | undefined {
    for (const value of values) {
      const questionType = this.extractQuestionType(value);
      if (questionType) {
        return questionType;
      }
    }

    return undefined;
  }

  private extractQuestionType(value: unknown): QuestionType | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }

    const normalized = value.trim().toUpperCase();
    if (!QUESTION_TYPE_VALUES.has(normalized)) {
      return undefined;
    }

    return normalized as QuestionType;
  }

  private extractMetadataType(value: unknown): QuestionType | undefined {
    const raw = this.toRecord(value);
    return this.extractQuestionType(raw?.type);
  }

  private findDominantQuestionType(
    questions: ExtractedQuestion[],
  ): QuestionType | undefined {
    const counts = new Map<QuestionType, number>();

    for (const question of questions) {
      const questionType = this.resolveQuestionType(
        question.questionType,
        this.extractMetadataType(question.metadata),
      );
      if (!questionType) {
        continue;
      }

      counts.set(questionType, (counts.get(questionType) || 0) + 1);
    }

    return [...counts.entries()].sort(
      (left, right) => right[1] - left[1],
    )[0]?.[0];
  }

  private buildQuestionRangeTitle(
    questions: ExtractedQuestion[],
  ): string | undefined {
    if (questions.length === 0) {
      return undefined;
    }

    const first = questions[0]?.questionNumber;
    const last = questions[questions.length - 1]?.questionNumber;

    if (!first || !last) {
      return undefined;
    }

    return first === last ? `Question ${first}` : `Questions ${first}-${last}`;
  }

  private defaultPartName(testType: TestType, index: number): string {
    return testType === TestType.LISTENING
      ? `Section ${index + 1}`
      : `Part ${index + 1}`;
  }

  private countParagraphs(content: string): number | undefined {
    const paragraphs = content
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);

    return paragraphs.length > 0 ? paragraphs.length : undefined;
  }

  private inferMaxWords(...texts: Array<unknown>): number | undefined {
    const combined = texts
      .filter((value): value is string => {
        return typeof value === 'string' && value.trim().length > 0;
      })
      .join(' ')
      .toLowerCase();

    if (!combined) {
      return undefined;
    }

    const match =
      combined.match(
        /no more than\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+words?/,
      ) ||
      combined.match(
        /(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+words?\s+(?:and\/or\s+a\s+number|only)/,
      ) ||
      combined.match(
        /write\s+(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+word/,
      );

    if (!match) {
      return undefined;
    }

    return this.parseNumberToken(match[1]);
  }

  private inferMultiSelect(
    instructions: string | undefined,
    correctOptionIndexes: number[],
  ): boolean {
    if (correctOptionIndexes.length > 1) {
      return true;
    }

    if (!instructions) {
      return false;
    }

    return /choose\s+(two|three|\d+)/i.test(instructions);
  }

  private inferHasWordBank(
    metadata: LooseRecord,
    instructions: string | undefined,
  ): boolean {
    if (Array.isArray(metadata.wordBank) && metadata.wordBank.length > 0) {
      return true;
    }

    if (!instructions) {
      return false;
    }

    return /(box|word bank|list of words|choose from the list)/i.test(
      instructions,
    );
  }

  private extractBracketedQuestionNumber(text: string): number | undefined {
    const match = text.match(/\[(\d+)\]/);
    return match ? Number(match[1]) : undefined;
  }

  private inferWritingTaskType(
    ...values: Array<unknown>
  ): 'TASK1' | 'TASK2' | undefined {
    const combined = values
      .filter((value): value is string => {
        return typeof value === 'string' && value.trim().length > 0;
      })
      .join(' ')
      .toUpperCase();

    if (combined.includes('TASK 1') || combined.includes('TASK1')) {
      return 'TASK1';
    }
    if (combined.includes('TASK 2') || combined.includes('TASK2')) {
      return 'TASK2';
    }

    return undefined;
  }

  private inferSpeakingPart(
    ...values: Array<unknown>
  ): 'PART1' | 'PART2' | 'PART3' | undefined {
    const combined = values
      .filter((value): value is string => {
        return typeof value === 'string' && value.trim().length > 0;
      })
      .join(' ')
      .toUpperCase();

    if (combined.includes('PART 1') || combined.includes('PART1')) {
      return 'PART1';
    }
    if (combined.includes('PART 2') || combined.includes('PART2')) {
      return 'PART2';
    }
    if (combined.includes('PART 3') || combined.includes('PART3')) {
      return 'PART3';
    }

    return undefined;
  }

  private extractWritingTaskType(
    value: unknown,
  ): 'TASK1' | 'TASK2' | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }

    const normalized = value.trim().toUpperCase().replace(/\s+/g, '');
    if (!WRITING_TASK_TYPES.has(normalized)) {
      return undefined;
    }

    return normalized as 'TASK1' | 'TASK2';
  }

  private extractSpeakingPart(
    value: unknown,
  ): 'PART1' | 'PART2' | 'PART3' | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }

    const normalized = value.trim().toUpperCase().replace(/\s+/g, '');
    if (!SPEAKING_PART_TYPES.has(normalized)) {
      return undefined;
    }

    return normalized as 'PART1' | 'PART2' | 'PART3';
  }

  private pickNonEmptyString(...values: unknown[]): string | undefined {
    for (const value of values) {
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }

    return undefined;
  }

  private pickEnumValue<T extends string>(
    value: unknown,
    allowedValues: readonly T[],
  ): T | null {
    if (typeof value !== 'string') {
      return null;
    }

    const normalized = value.trim().toUpperCase();
    return allowedValues.includes(normalized as T) ? (normalized as T) : null;
  }

  private pickPositiveInt(...values: unknown[]): number | undefined {
    for (const value of values) {
      const numberValue = this.coerceFiniteNumber(value);
      if (
        numberValue !== undefined &&
        Number.isInteger(numberValue) &&
        numberValue > 0
      ) {
        return numberValue;
      }
    }

    return undefined;
  }

  private pickNonNegativeInt(...values: unknown[]): number | undefined {
    for (const value of values) {
      const numberValue = this.coerceFiniteNumber(value);
      if (
        numberValue !== undefined &&
        Number.isInteger(numberValue) &&
        numberValue >= 0
      ) {
        return numberValue;
      }
    }

    return undefined;
  }

  private sanitizeStringArray(
    candidate: unknown,
    fallback?: string[],
  ): string[] {
    const source = Array.isArray(candidate)
      ? candidate
      : Array.isArray(fallback)
        ? fallback
        : [];

    return source
      .filter((value): value is string => {
        return typeof value === 'string' && value.trim().length > 0;
      })
      .map((value) => value.trim());
  }

  private parseNumberToken(value: string): number | undefined {
    if (/^\d+$/.test(value)) {
      return Number(value);
    }

    return NUMBER_WORDS[value.toLowerCase()];
  }

  private coerceFiniteNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value.trim());
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return undefined;
  }

  private toRecord(value: unknown): LooseRecord | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return undefined;
    }

    return value as LooseRecord;
  }

  private normalizeVerificationChanges(
    candidate: unknown,
    before: ExtractedRawDataDto,
    after: ExtractedRawDataDto,
  ): VerificationChangeDto[] {
    if (Array.isArray(candidate)) {
      const normalized = candidate
        .map((change) => this.normalizeVerificationChange(change))
        .filter((change): change is VerificationChangeDto => change !== null);

      if (normalized.length > 0) {
        return normalized;
      }
    }

    return this.computeVerificationChanges(before, after);
  }

  private normalizeVerificationChange(
    candidate: unknown,
  ): VerificationChangeDto | null {
    if (!candidate || typeof candidate !== 'object') {
      return null;
    }

    const raw = candidate as Record<string, unknown>;
    if (typeof raw.field !== 'string' || !raw.field.trim()) {
      return null;
    }

    return {
      field: raw.field.trim(),
      before: this.stringifyChangeValue(raw.before),
      after: this.stringifyChangeValue(raw.after),
      confidence: this.normalizeConfidence(raw.confidence),
    };
  }

  private computeVerificationChanges(
    before: unknown,
    after: unknown,
    path = 'verifiedData',
  ): VerificationChangeDto[] {
    if (this.areDeepEqual(before, after)) {
      return [];
    }

    const beforeIsObject =
      before !== null && typeof before === 'object' && !Array.isArray(before);
    const afterIsObject =
      after !== null && typeof after === 'object' && !Array.isArray(after);

    if (Array.isArray(before) && Array.isArray(after)) {
      const maxLength = Math.max(before.length, after.length);
      const changes: VerificationChangeDto[] = [];

      for (let index = 0; index < maxLength; index++) {
        changes.push(
          ...this.computeVerificationChanges(
            before[index],
            after[index],
            `${path}[${index}]`,
          ),
        );
      }

      return changes;
    }

    if (beforeIsObject && afterIsObject) {
      const keys = new Set([
        ...Object.keys(before as Record<string, unknown>),
        ...Object.keys(after as Record<string, unknown>),
      ]);

      const changes: VerificationChangeDto[] = [];
      for (const key of keys) {
        changes.push(
          ...this.computeVerificationChanges(
            (before as Record<string, unknown>)[key],
            (after as Record<string, unknown>)[key],
            `${path}.${key}`,
          ),
        );
      }
      return changes;
    }

    return [
      {
        field: path,
        before: this.stringifyChangeValue(before),
        after: this.stringifyChangeValue(after),
        confidence: 0.8,
      },
    ];
  }

  private keepOnlyRelevantSections(
    data: ExtractedRawDataDto,
    testType: TestType,
  ): ExtractedRawDataDto {
    const normalized = this.deepClone(data);

    if (testType === TestType.READING || testType === TestType.LISTENING) {
      delete normalized.writingTasks;
      delete normalized.speakingTasks;
    }

    if (testType === TestType.WRITING) {
      delete normalized.parts;
      delete normalized.speakingTasks;
    }

    if (testType === TestType.SPEAKING) {
      delete normalized.parts;
      delete normalized.writingTasks;
    }

    return normalized;
  }

  private stringifyChangeValue(value: unknown): string {
    if (value === undefined) {
      return 'undefined';
    }

    if (typeof value === 'string') {
      return value;
    }

    return JSON.stringify(value);
  }

  private normalizeConfidence(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.min(1, Math.max(0, value));
    }

    return 0.8;
  }

  private isValidLevel(value: unknown): value is ExtractedRawDataDto['level'] {
    return (
      value === 'Low' ||
      value === 'Mid' ||
      value === 'High' ||
      value === 'Great'
    );
  }

  private deepClone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }

  private areDeepEqual(left: unknown, right: unknown): boolean {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  private convertDoclingToParsedData(
    doclingResult: { text: string; markdown: string; confidence: number; warnings: string[] },
    testType: string,
  ): ExtractedExamData {
    // Convert Docling's text output to the format expected by structure-analyzer
    const pageContents = doclingResult.text.split(/\n\n+/).filter(Boolean);
    const pages = pageContents.map((content, index) => ({
      pageNumber: index + 1,
      text: content,
      blocks: [] as TextBlock[],
    }));

    return {
      title: 'IELTS Practice Test',
      level: 'Mid' as const,
      rawText: doclingResult.text,
      pages,
      blocks: [],
      profile: {
        pageCount: pages.length,
        averageCharsPerPage: doclingResult.text.length / Math.max(pages.length, 1),
        likelyImageBased: doclingResult.warnings.some((w) => w.includes('image')),
        likelyMultiColumn: false,
        repeatedArtifacts: [],
      },
      confidence: doclingResult.confidence,
      warnings: doclingResult.warnings,
    };
  }
}

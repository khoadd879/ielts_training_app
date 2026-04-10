import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { CloudinaryService } from '../../../cloudinary/cloudinary.service';
import { DatabaseService } from '../../../database/database.service';
import { TestType, UploadPdfDto } from '../dto/upload-pdf.dto';
import {
  ExtractionResultDto,
  ExtractedRawDataDto,
  SaveResultDto,
  UpdateSessionDto,
  VerificationResultDto,
  VerificationChangeDto,
} from '../dto/extraction-result.dto';
import { PdfParserService } from './pdf-parser.service';
import { StructureAnalyzerService } from './structure-analyzer.service';

// In-memory session storage (replace with Redis in production)
interface ExtractionSession {
  idSession: string;
  idUser?: string;
  testType: TestType;
  rawPdfUrl?: string;
  rawData?: ExtractedRawDataDto;
  verifiedData?: ExtractedRawDataDto;
  status: 'PENDING' | 'PROCESSING' | 'READY_FOR_VERIFICATION' | 'NEEDS_MANUAL_ENTRY' | 'READY_FOR_REVIEW' | 'REVIEWED' | 'APPROVED' | 'DISCARDED';
  confidence: number;
  warnings: string[];
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class PdfExamService {
  private readonly logger = new Logger(PdfExamService.name);

  // Session storage (in-memory for now, use Redis in production)
  private readonly sessions = new Map<string, ExtractionSession>();

  constructor(
    private readonly pdfParserService: PdfParserService,
    private readonly structureAnalyzerService: StructureAnalyzerService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
  ) {}

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

    this.logger.log(`[${correlationId}] Starting PDF upload, session: ${idSession}`);

    // Validate file
    this.validateFile(file);

    try {
      // Upload to Cloudinary
      this.logger.log(`[${correlationId}] Uploading to Cloudinary`);
      const uploadResult = await this.cloudinaryService.uploadFile(file, 'pdf-exams', 'raw');
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

      // Parse PDF
      this.logger.log(`[${correlationId}] Parsing PDF`);
      const parsedData = await this.pdfParserService.parsePdf(
        file.buffer,
        dto.testType,
      );

      // Override title if provided
      if (dto.title) {
        parsedData.title = dto.title;
      }
      if (dto.level) {
        parsedData.level = dto.level;
      }

      // Analyze structure
      this.logger.log(`[${correlationId}] Analyzing structure`);
      const analysisResult = await this.structureAnalyzerService.analyze(
        parsedData,
        dto.testType,
      );

      // Update session
      session.rawData = analysisResult.data;
      session.confidence = analysisResult.confidence;
      session.warnings = analysisResult.warnings;
      session.status = 'READY_FOR_VERIFICATION';
      session.updatedAt = new Date();
      this.sessions.set(idSession, session);

      this.logger.log(`[${correlationId}] Extraction complete, confidence: ${analysisResult.confidence}`);

      return {
        idSession,
        rawData: analysisResult.data,
        status: session.status,
        confidence: analysisResult.confidence,
        warnings: analysisResult.warnings,
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
      rawData: session.verifiedData || session.rawData || { title: session.testType },
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
      session.rawData = dto.data;
    }
    if (dto.status) {
      session.status = dto.status as ExtractionSession['status'];
    }
    session.updatedAt = new Date();
    this.sessions.set(idSession, session);

    return {
      idSession: session.idSession,
      rawData: session.verifiedData || session.rawData || { title: session.testType },
      status: session.status,
      confidence: session.confidence,
      warnings: session.warnings,
      rawPdfUrl: session.rawPdfUrl,
      createdAt: session.createdAt.toISOString(),
    };
  }

  /**
   * AI Verification (placeholder - Groq integration in Phase 3)
   */
  async verifySession(idSession: string): Promise<VerificationResultDto> {
    const session = this.sessions.get(idSession);
    if (!session) {
      throw new NotFoundException(`Session ${idSession} not found`);
    }

    if (!session.rawData) {
      throw new BadRequestException('No data to verify');
    }

    this.logger.log(`[${idSession}] AI verification requested`);

    // TODO: Implement Groq integration in Phase 3
    // For now, just mark as verified with same data
    const changes: VerificationChangeDto[] = [];
    session.verifiedData = session.rawData;
    session.status = 'READY_FOR_REVIEW';
    session.updatedAt = new Date();
    this.sessions.set(idSession, session);

    return {
      idSession: session.idSession,
      verifiedData: session.verifiedData,
      changes,
      status: session.status,
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

    if (session.status !== 'READY_FOR_REVIEW' && session.status !== 'REVIEWED') {
      throw new BadRequestException(
        `Session must be reviewed before saving. Current status: ${session.status}`,
      );
    }

    const dataToSave = session.verifiedData || session.rawData;
    if (!dataToSave) {
      throw new BadRequestException('No data to save');
    }

    this.logger.log(`[${correlationId}] Saving session ${idSession} to database`);

    try {
      // Create test record
      const test = await this.databaseService.test.create({
        data: {
          idUser,
          title: dataToSave.title || `IELTS ${session.testType} Practice`,
          description: `Imported from PDF session ${idSession}`,
          testType: session.testType,
          level: dataToSave.level || 'Mid',
          duration: session.testType === TestType.WRITING ? 3600 : session.testType === TestType.SPEAKING ? 900 : 3600,
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
          const part = await this.databaseService.part.create({
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
            await this.databaseService.passage.create({
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
            const group = await this.databaseService.questionGroup.create({
              data: {
                idPart: part.idPart,
                title: groupData.title,
                instructions: groupData.instructions,
                questionType: groupData.questionType || 'MULTIPLE_CHOICE',
                order: groupData.order || 0,
              },
            });

            for (const questionData of groupData.questions) {
              await this.databaseService.question.create({
                data: {
                  idQuestionGroup: group.idQuestionGroup,
                  idPart: part.idPart,
                  questionNumber: questionData.questionNumber,
                  content: questionData.content,
                  questionType: questionData.questionType || groupData.questionType || 'MULTIPLE_CHOICE',
                  metadata: (questionData.metadata || {}) as Prisma.InputJsonValue,
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
          await this.databaseService.writingTask.create({
            data: {
              idTest: test.idTest,
              title: taskData.title,
              taskType: taskData.taskType,
              timeLimit: taskData.timeLimit || (taskData.taskType === 'TASK1' ? 1200 : 2400),
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
          const speakingTask = await this.databaseService.speakingTask.create({
            data: {
              idTest: test.idTest,
              title: taskData.title,
              part: taskData.part,
            },
          });
          speakingTasksCreated++;

          for (const questionData of taskData.questions) {
            await this.databaseService.speakingQuestion.create({
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

      // Mark session as approved
      session.status = 'APPROVED';
      session.updatedAt = new Date();
      this.sessions.set(idSession, session);

      this.logger.log(`[${correlationId}] Save complete, test: ${test.idTest}`);

      return {
        idTest: test.idTest,
        message: 'Test saved successfully',
        partsCreated,
        questionsCreated,
        writingTasksCreated,
        speakingTasksCreated,
        speakingQuestionsCreated,
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
    setTimeout(() => {
      this.sessions.delete(idSession);
    }, 60 * 60 * 1000); // Delete after 1 hour
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
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/passport/jwt-auth.guard';
import { PdfExamService } from './services/pdf-exam.service';
import { UploadPdfDto } from './dto/upload-pdf.dto';
import {
  ExtractionResultDto,
  UpdateSessionDto,
  SaveResultDto,
} from './dto/extraction-result.dto';

@ApiBearerAuth()
@Controller('pdf-exam')
@UseGuards(JwtAuthGuard)
export class PdfExamController {
  private readonly logger = new Logger(PdfExamController.name);

  constructor(private readonly pdfExamService: PdfExamService) {}

  /**
   * Upload PDF, extract with code, then refine with AI in the same flow
   * POST /pdf-exam/extract
   */
  @Post('extract')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'PDF file' },
        testType: {
          type: 'string',
          enum: ['LISTENING', 'READING', 'WRITING', 'SPEAKING'],
          description: 'Type of IELTS test',
        },
        title: { type: 'string', description: 'Optional test title' },
        level: {
          type: 'string',
          enum: ['Low', 'Mid', 'High', 'Great'],
          description: 'Optional difficulty level',
        },
      },
    },
  })
  async extract(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadPdfDto: UploadPdfDto,
  ): Promise<ExtractionResultDto> {
    this.logger.log(
      `[EXTRACT] POST /pdf-exam/extract - testType: ${uploadPdfDto.testType}, title: ${uploadPdfDto.title || 'N/A'}, level: ${uploadPdfDto.level || 'N/A'}`,
    );
    this.logger.debug(
      `[EXTRACT] File info - originalname: ${file?.originalname}, mimetype: ${file?.mimetype}, size: ${file?.size}`,
    );

    const result = await this.pdfExamService.uploadAndExtract(
      file,
      uploadPdfDto,
    );

    this.logger.log(
      `[EXTRACT] Session created - idSession: ${result.idSession}, status: ${result.status}, confidence: ${result.confidence}`,
    );
    this.logger.debug(
      `[EXTRACT] Raw data keys: ${Object.keys(result.rawData || {})}, warnings: ${result.warnings?.length || 0}`,
    );

    return result;
  }

  /**
   * Get session status and data
   * GET /pdf-exam/session/:idSession
   */
  @Get('session/:idSession')
  async getSession(
    @Param('idSession') idSession: string,
  ): Promise<ExtractionResultDto> {
    this.logger.log(`[GET-SESSION] GET /pdf-exam/session/${idSession}`);

    const result = await this.pdfExamService.getSession(idSession);

    this.logger.log(
      `[GET-SESSION] idSession: ${idSession}, status: ${result.status}, confidence: ${result.confidence}`,
    );

    return result;
  }

  /**
   * Update session (manual edits)
   * PATCH /pdf-exam/session/:idSession
   */
  @Patch('session/:idSession')
  async updateSession(
    @Param('idSession') idSession: string,
    @Body() updateSessionDto: UpdateSessionDto,
  ): Promise<ExtractionResultDto> {
    this.logger.log(`[UPDATE-SESSION] PATCH /pdf-exam/session/${idSession}`);
    this.logger.debug(
      `[UPDATE-SESSION] DTO keys: ${Object.keys(updateSessionDto)}, status in DTO: ${updateSessionDto.status}`,
    );

    const result = await this.pdfExamService.updateSession(
      idSession,
      updateSessionDto,
    );

    this.logger.log(
      `[UPDATE-SESSION] idSession: ${idSession}, new status: ${result.status}`,
    );

    return result;
  }

  /**
   * Save to database
   * POST /pdf-exam/save/:idSession
   */
  @Post('save/:idSession')
  async saveSession(
    @Param('idSession') idSession: string,
    @Body('idUser') idUser: string,
  ): Promise<SaveResultDto> {
    this.logger.log(
      `[SAVE] POST /pdf-exam/save/${idSession} - idUser: ${idUser}`,
    );

    const result = await this.pdfExamService.saveSession(idSession, idUser);

    this.logger.log(
      `[SAVE] idSession: ${idSession}, idTest: ${result.idTest}, parts: ${result.partsCreated}, questions: ${result.questionsCreated}, writingTasks: ${result.writingTasksCreated}, speakingTasks: ${result.speakingTasksCreated}, speakingQuestions: ${result.speakingQuestionsCreated}`,
    );

    return result;
  }

  /**
   * Discard/delete session
   * DELETE /pdf-exam/session/:idSession
   */
  @Delete('session/:idSession')
  async deleteSession(
    @Param('idSession') idSession: string,
  ): Promise<{ message: string }> {
    this.logger.log(`[DELETE] DELETE /pdf-exam/session/${idSession}`);

    await this.pdfExamService.deleteSession(idSession);

    this.logger.log(`[DELETE] Session discarded - idSession: ${idSession}`);

    return { message: 'Session discarded' };
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../auth/passport/jwt-auth.guard';
import { PdfExamService } from './services/pdf-exam.service';
import { UploadPdfDto, TestType } from './dto/upload-pdf.dto';
import {
  ExtractionResultDto,
  UpdateSessionDto,
  VerificationResultDto,
  SaveResultDto,
} from './dto/extraction-result.dto';

@ApiBearerAuth()
@Controller('pdf-exam')
@UseGuards(JwtAuthGuard)
export class PdfExamController {
  constructor(private readonly pdfExamService: PdfExamService) {}

  /**
   * Upload PDF and extract exam structure
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
    return this.pdfExamService.uploadAndExtract(file, uploadPdfDto);
  }

  /**
   * Get session status and data
   * GET /pdf-exam/session/:idSession
   */
  @Get('session/:idSession')
  async getSession(
    @Param('idSession') idSession: string,
  ): Promise<ExtractionResultDto> {
    return this.pdfExamService.getSession(idSession);
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
    return this.pdfExamService.updateSession(idSession, updateSessionDto);
  }

  /**
   * AI verification of extracted data
   * POST /pdf-exam/verify/:idSession
   */
  @Post('verify/:idSession')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  async verifySession(
    @Param('idSession') idSession: string,
  ): Promise<VerificationResultDto> {
    return this.pdfExamService.verifySession(idSession);
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
    return this.pdfExamService.saveSession(idSession, idUser);
  }

  /**
   * Discard/delete session
   * DELETE /pdf-exam/session/:idSession
   */
  @Delete('session/:idSession')
  async deleteSession(
    @Param('idSession') idSession: string,
  ): Promise<{ message: string }> {
    await this.pdfExamService.deleteSession(idSession);
    return { message: 'Session discarded' };
  }
}

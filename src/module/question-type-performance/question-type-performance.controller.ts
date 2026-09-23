import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { QuestionTypePerformanceService } from './question-type-performance.service';
import { Public } from 'src/decorator/customize';

@Controller('question-type-performance')
export class QuestionTypePerformanceController {
  constructor(private readonly service: QuestionTypePerformanceService) {}

  @Get('weak/:userId')
  async getWeakTypes(@Param('userId') userId: string) {
    return this.service.getWeakQuestionTypes(userId);
  }

  @Get('all/:userId')
  async getAll(@Param('userId') userId: string) {
    return this.service.getAllQuestionTypePerformance(userId);
  }

  /**
   * Internal endpoint called by ai-grading-worker after async grading finishes.
   * Polls until all submissions for the testResult are COMPLETED, then tracks.
   * Public (no JWT) — worker uses INTERNAL_API_SECRET header for auth.
   */
  @Public()
  @Post('track-from-worker')
  async trackFromWorker(
    @Body() body: { idUser: string; idTestResult: string; skillType: 'WRITING' | 'SPEAKING' },
  ) {
    return this.service.trackFromWorker(body.idUser, body.idTestResult, body.skillType);
  }
}

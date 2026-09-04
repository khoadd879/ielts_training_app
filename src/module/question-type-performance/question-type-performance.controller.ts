import { Controller, Get, Param } from '@nestjs/common';
import { QuestionTypePerformanceService } from './question-type-performance.service';

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
}

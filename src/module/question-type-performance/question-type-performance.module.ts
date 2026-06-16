import { Module } from '@nestjs/common';
import { QuestionTypePerformanceService } from './question-type-performance.service';
import { QuestionTypePerformanceController } from './question-type-performance.controller';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [QuestionTypePerformanceController],
  providers: [QuestionTypePerformanceService],
  exports: [QuestionTypePerformanceService],
})
export class QuestionTypePerformanceModule {}
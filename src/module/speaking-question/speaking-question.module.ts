import { Module } from '@nestjs/common';
import { SpeakingQuestionService } from './speaking-question.service';
import { SpeakingQuestionController } from './speaking-question.controller';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [SpeakingQuestionController],
  providers: [SpeakingQuestionService],
})
export class SpeakingQuestionModule {}

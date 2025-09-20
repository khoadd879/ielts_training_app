import { Module } from '@nestjs/common';
import { GroupOfQuestionsService } from './group-of-questions.service';
import { GroupOfQuestionsController } from './group-of-questions.controller';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [GroupOfQuestionsController],
  providers: [GroupOfQuestionsService],
})
export class GroupOfQuestionsModule {}

import { Module } from '@nestjs/common';
import { UserWritingSubmissionService } from './user-writing-submission.service';
import { UserWritingSubmissionController } from './user-writing-submission.controller';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [UserWritingSubmissionController],
  providers: [UserWritingSubmissionService],
})
export class UserWritingSubmissionModule {}

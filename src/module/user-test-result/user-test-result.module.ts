import { Module } from '@nestjs/common';
import { UserTestResultService } from './user-test-result.service';
import { UserTestResultController } from './user-test-result.controller';
import { DatabaseModule } from 'src/database/database.module';
import { StreakServiceModule } from '../streak-service/streak-service.module';
import { UserWritingSubmissionModule } from '../user-writing-submission/user-writing-submission.module';
import { UserSpeakingSubmissionModule } from '../user-speaking-submission/user-speaking-submission.module';

@Module({
  imports: [DatabaseModule, StreakServiceModule, UserWritingSubmissionModule, UserSpeakingSubmissionModule],
  controllers: [UserTestResultController],
  providers: [UserTestResultService],
})
export class UserTestResultModule { }

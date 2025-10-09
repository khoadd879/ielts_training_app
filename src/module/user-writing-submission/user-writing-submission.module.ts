import { Module } from '@nestjs/common';
import { UserWritingSubmissionService } from './user-writing-submission.service';
import { UserWritingSubmissionController } from './user-writing-submission.controller';
import { DatabaseModule } from 'src/database/database.module';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    DatabaseModule,
    CacheModule.register({
      ttl: 5, // time-to-live (seconds)
      max: 100, // maximum number of items in cache
    }),
  ],
  controllers: [UserWritingSubmissionController],
  providers: [UserWritingSubmissionService],
})
export class UserWritingSubmissionModule {}

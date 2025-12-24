import { Module } from '@nestjs/common';
import { UserSpeakingSubmissionService } from './user-speaking-submission.service';
import { UserSpeakingSubmissionController } from './user-speaking-submission.controller';
import { DatabaseModule } from 'src/database/database.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';

@Module({
  imports: [DatabaseModule, CloudinaryModule],
  controllers: [UserSpeakingSubmissionController],
  providers: [UserSpeakingSubmissionService],
  exports: [UserSpeakingSubmissionService], // Export để dùng ở module khác
})
export class UserSpeakingSubmissionModule { }

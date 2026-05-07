import { Module } from '@nestjs/common';
import { TeacherReviewService } from './teacher-review.service';
import { TeacherReviewController } from './teacher-review.controller';
import { DatabaseModule } from 'src/database/database.module';
import { SystemConfigModule } from '../system-config/system-config.module';

@Module({
  imports: [DatabaseModule, SystemConfigModule],
  controllers: [TeacherReviewController],
  providers: [TeacherReviewService],
  exports: [TeacherReviewService],
})
export class TeacherReviewModule {}

import { Module } from '@nestjs/common';
import { SpeakingTaskService } from './speaking-task.service';
import { SpeakingTaskController } from './speaking-task.controller';
import { DatabaseModule } from 'src/database/database.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';

@Module({
  imports: [DatabaseModule, CloudinaryModule],
  controllers: [SpeakingTaskController],
  providers: [SpeakingTaskService],
})
export class SpeakingTaskModule {}

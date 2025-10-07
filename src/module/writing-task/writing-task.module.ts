import { Module } from '@nestjs/common';
import { WritingTaskService } from './writing-task.service';
import { WritingTaskController } from './writing-task.controller';
import { DatabaseModule } from 'src/database/database.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';

@Module({
  imports: [DatabaseModule, CloudinaryModule],
  controllers: [WritingTaskController],
  providers: [WritingTaskService],
})
export class WritingTaskModule {}

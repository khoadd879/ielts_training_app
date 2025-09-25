import { Module } from '@nestjs/common';
import { WritingTaskService } from './writing-task.service';
import { WritingTaskController } from './writing-task.controller';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [WritingTaskController],
  providers: [WritingTaskService],
})
export class WritingTaskModule {}

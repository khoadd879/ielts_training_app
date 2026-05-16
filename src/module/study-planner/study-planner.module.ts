import { Module } from '@nestjs/common';
import { StudyPlannerController } from './study-planner.controller';
import { StudyPlannerService } from './study-planner.service';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [StudyPlannerController],
  providers: [StudyPlannerService],
  exports: [StudyPlannerService],
})
export class StudyPlannerModule {}
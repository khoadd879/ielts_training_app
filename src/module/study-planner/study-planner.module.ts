import { Module } from '@nestjs/common';
import { StudyPlannerController } from './study-planner.controller';
import { StudyPlannerService } from './study-planner.service';
import { DatabaseModule } from 'src/database/database.module';
import { SystemConfigModule } from 'src/module/system-config/system-config.module';

@Module({
  imports: [DatabaseModule, SystemConfigModule],
  controllers: [StudyPlannerController],
  providers: [StudyPlannerService],
  exports: [StudyPlannerService],
})
export class StudyPlannerModule {}
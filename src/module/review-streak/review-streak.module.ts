import { Module } from '@nestjs/common';
import { ReviewStreakService } from './review-streak.service';
import { ReviewStreakController } from './review-streak.controller';
import { DatabaseModule } from 'src/database/database.module';
import { StreakServiceModule } from '../streak-service/streak-service.module';

@Module({
  imports: [DatabaseModule, StreakServiceModule],
  controllers: [ReviewStreakController],
  providers: [ReviewStreakService],
})
export class ReviewStreakModule {}

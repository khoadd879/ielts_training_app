import { Module } from '@nestjs/common';
import { StreakService } from './streak-service.service';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [StreakService],
  exports: [StreakService],
})
export class StreakServiceModule {}

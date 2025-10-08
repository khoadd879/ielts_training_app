import { Module } from '@nestjs/common';
import { UserTestResultService } from './user-test-result.service';
import { UserTestResultController } from './user-test-result.controller';
import { DatabaseModule } from 'src/database/database.module';
import { StreakServiceModule } from '../streak-service/streak-service.module';

@Module({
  imports: [DatabaseModule, StreakServiceModule],
  controllers: [UserTestResultController],
  providers: [UserTestResultService],
})
export class UserTestResultModule {}

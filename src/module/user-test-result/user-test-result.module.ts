import { Module } from '@nestjs/common';
import { UserTestResultService } from './user-test-result.service';
import { UserTestResultController } from './user-test-result.controller';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [UserTestResultController],
  providers: [UserTestResultService],
})
export class UserTestResultModule {}

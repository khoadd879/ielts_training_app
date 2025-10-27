import { Module } from '@nestjs/common';
import { RecommendTestService } from './recommend-test.service';
import { RecommendTestController } from './recommend-test.controller';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [RecommendTestController],
  providers: [RecommendTestService],
})
export class RecommendTestModule {}

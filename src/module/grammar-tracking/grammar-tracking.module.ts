import { Module } from '@nestjs/common';
import { GrammarTrackingService } from './grammar-tracking.service';
import { GrammarTrackingController } from './grammar-tracking.controller';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [GrammarTrackingController],
  providers: [GrammarTrackingService],
  exports: [GrammarTrackingService],
})
export class GrammarTrackingModule {}
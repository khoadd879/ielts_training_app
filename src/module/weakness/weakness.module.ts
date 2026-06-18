import { Module } from '@nestjs/common';
import { WeaknessController } from './weakness.controller';
import { WeaknessService } from './weakness.service';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [WeaknessController],
  providers: [WeaknessService],
  exports: [WeaknessService],
})
export class WeaknessModule {}

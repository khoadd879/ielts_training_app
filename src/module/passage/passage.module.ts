import { Module } from '@nestjs/common';
import { PassageService } from './passage.service';
import { PassageController } from './passage.controller';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [PassageController],
  providers: [PassageService],
})
export class PassageModule {}

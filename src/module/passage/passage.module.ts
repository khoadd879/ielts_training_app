import { Module } from '@nestjs/common';
import { PassageService } from './passage.service';
import { PassageController } from './passage.controller';
import { DatabaseModule } from 'src/database/database.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';

@Module({
  imports: [DatabaseModule, CloudinaryModule],
  controllers: [PassageController],
  providers: [PassageService],
})
export class PassageModule {}

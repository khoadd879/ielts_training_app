import { Module } from '@nestjs/common';
import { GroupOfQuestionsService } from './group-of-questions.service';
import { GroupOfQuestionsController } from './group-of-questions.controller';
import { DatabaseModule } from 'src/database/database.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';

@Module({
  imports: [DatabaseModule, CloudinaryModule],
  controllers: [GroupOfQuestionsController],
  providers: [GroupOfQuestionsService],
})
export class GroupOfQuestionsModule {}

import { Module } from '@nestjs/common';
import { QuestionGroupService } from './question-group.service';
import { QuestionGroupController } from './question-group.controller';
import { DatabaseModule } from 'src/database/database.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';

@Module({
  imports: [DatabaseModule, CloudinaryModule],
  controllers: [QuestionGroupController],
  providers: [QuestionGroupService],
})
export class QuestionGroupModule {}

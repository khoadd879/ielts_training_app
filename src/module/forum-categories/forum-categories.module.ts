import { Module } from '@nestjs/common';
import { ForumCategoriesService } from './forum-categories.service';
import { ForumCategoriesController } from './forum-categories.controller';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ForumCategoriesController],
  providers: [ForumCategoriesService],
})
export class ForumCategoriesModule {}

import { Module } from '@nestjs/common';
import { ForumCategoriesService } from './forum-categories.service';
import { ForumCategoriesController } from './forum-categories.controller';

@Module({
  controllers: [ForumCategoriesController],
  providers: [ForumCategoriesService],
})
export class ForumCategoriesModule {}

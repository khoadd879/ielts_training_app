import { Module } from '@nestjs/common';
import { ForumPostLikesService } from './forum-post-likes.service';
import { ForumPostLikesController } from './forum-post-likes.controller';

@Module({
  controllers: [ForumPostLikesController],
  providers: [ForumPostLikesService],
})
export class ForumPostLikesModule {}

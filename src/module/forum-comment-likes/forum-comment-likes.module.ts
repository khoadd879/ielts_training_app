import { Module } from '@nestjs/common';
import { ForumCommentLikesService } from './forum-comment-likes.service';
import { ForumCommentLikesController } from './forum-comment-likes.controller';

@Module({
  controllers: [ForumCommentLikesController],
  providers: [ForumCommentLikesService],
})
export class ForumCommentLikesModule {}

import { Module } from '@nestjs/common';
import { ForumCommentLikesService } from './forum-comment-likes.service';
import { ForumCommentLikesController } from './forum-comment-likes.controller';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ForumCommentLikesController],
  providers: [ForumCommentLikesService],
})
export class ForumCommentLikesModule {}

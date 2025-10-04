import { Module } from '@nestjs/common';
import { ForumCommentService } from './forum-comment.service';
import { ForumCommentController } from './forum-comment.controller';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ForumCommentController],
  providers: [ForumCommentService],
})
export class ForumCommentModule {}

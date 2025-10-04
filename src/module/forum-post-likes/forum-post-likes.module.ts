import { Module } from '@nestjs/common';
import { ForumPostLikesService } from './forum-post-likes.service';
import { ForumPostLikesController } from './forum-post-likes.controller';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ForumPostLikesController],
  providers: [ForumPostLikesService],
})
export class ForumPostLikesModule {}

import { Module } from '@nestjs/common';
import { ForumPostService } from './forum-post.service';
import { ForumPostController } from './forum-post.controller';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ForumPostController],
  providers: [ForumPostService],
})
export class ForumPostModule {}

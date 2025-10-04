import { Module } from '@nestjs/common';
import { ForumThreadsService } from './forum-threads.service';
import { ForumThreadsController } from './forum-threads.controller';

@Module({
  controllers: [ForumThreadsController],
  providers: [ForumThreadsService],
})
export class ForumThreadsModule {}

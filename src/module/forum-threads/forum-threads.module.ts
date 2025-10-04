import { Module } from '@nestjs/common';
import { ForumThreadsService } from './forum-threads.service';
import { ForumThreadsController } from './forum-threads.controller';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ForumThreadsController],
  providers: [ForumThreadsService],
})
export class ForumThreadsModule {}

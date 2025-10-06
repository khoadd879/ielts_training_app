import { Module } from '@nestjs/common';
import { ForumPostService } from './forum-post.service';
import { ForumPostController } from './forum-post.controller';
import { DatabaseModule } from 'src/database/database.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';

@Module({
  imports: [DatabaseModule, CloudinaryModule],
  controllers: [ForumPostController],
  providers: [ForumPostService],
})
export class ForumPostModule {}

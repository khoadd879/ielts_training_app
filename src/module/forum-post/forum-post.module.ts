import { Module } from '@nestjs/common';
import { ForumPostService } from './forum-post.service';
import { ForumPostController } from './forum-post.controller';
import { DatabaseModule } from 'src/database/database.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { SystemConfigModule } from 'src/module/system-config/system-config.module';

@Module({
  imports: [DatabaseModule, CloudinaryModule, SystemConfigModule],
  controllers: [ForumPostController],
  providers: [ForumPostService],
})
export class ForumPostModule {}

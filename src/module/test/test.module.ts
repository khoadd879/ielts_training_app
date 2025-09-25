import { Module } from '@nestjs/common';
import { TestService } from './test.service';
import { TestController } from './test.controller';
import { DatabaseModule } from 'src/database/database.module';
import { UsersModule } from '../users/users.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { CacheModule } from '@nestjs/cache-manager';
import { MulterModule } from '@nestjs/platform-express';

@Module({
  imports: [
    DatabaseModule,
    UsersModule,
    CloudinaryModule,
    CacheModule.register({
      ttl: 5, // time-to-live (seconds)
      max: 100, // maximum number of items in cache
    }),
    MulterModule.register({
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
    }),
  ],
  controllers: [TestController],
  providers: [TestService],
})
export class TestModule {}

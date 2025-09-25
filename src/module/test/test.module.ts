import { Module } from '@nestjs/common';
import { TestService } from './test.service';
import { TestController } from './test.controller';
import { DatabaseModule } from 'src/database/database.module';
import { UsersModule } from '../users/users.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    DatabaseModule,
    UsersModule,
    CloudinaryModule,
    CacheModule.register({
      ttl: 5, // time-to-live (seconds)
      max: 100, // maximum number of items in cache
    }),
  ],
  controllers: [TestController],
  providers: [TestService],
})
export class TestModule {}

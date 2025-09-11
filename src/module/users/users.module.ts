import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { DatabaseModule } from 'src/database/database.module';
import { VerificationModule } from 'src/auth/verification/verification.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
@Module({
  imports: [DatabaseModule, VerificationModule, CloudinaryModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { DatabaseModule } from 'src/database/database.module';
import { VerificationModule } from 'src/auth/verification/verification.module';
@Module({
  imports: [DatabaseModule, VerificationModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

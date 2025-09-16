import { Module } from '@nestjs/common';
import { PartService } from './part.service';
import { PartController } from './part.controller';
import { DatabaseModule } from 'src/database/database.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [DatabaseModule, UsersModule],
  controllers: [PartController],
  providers: [PartService],
})
export class PartModule {}

import { Module } from '@nestjs/common';
import { SystemConfigService } from './system-config.service';
import { SystemConfigController } from './system-config.controller';
import { DatabaseModule } from 'src/database/database.module';
import { AuditLogModule } from 'src/module/audit-log/audit-log.module';

@Module({
  imports: [DatabaseModule, AuditLogModule],
  controllers: [SystemConfigController],
  providers: [SystemConfigService],
  exports: [SystemConfigService],
})
export class SystemConfigModule {}

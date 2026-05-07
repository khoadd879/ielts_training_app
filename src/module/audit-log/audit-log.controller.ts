import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { JwtAuthGuard } from 'src/auth/passport/jwt-auth.guard';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Role } from '@prisma/client';

@ApiTags('Audit Log')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Controller('audit-log')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get audit logs with filtering and pagination' })
  async getAuditLogs(@Query() query: AuditLogQueryDto) {
    return this.auditLogService.query({
      actorId: query.actorId,
      action: query.action,
      targetType: query.targetType,
      targetId: query.targetId,
      fromDate: query.fromDate ? new Date(query.fromDate) : undefined,
      toDate: query.toDate ? new Date(query.toDate) : undefined,
      page: query.page || 1,
      limit: query.limit || 20,
    });
  }
}
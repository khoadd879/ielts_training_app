import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { Role } from '@prisma/client';

@Injectable()
export class AuditLogService {
  constructor(private readonly databaseService: DatabaseService) {}

  async createEntry(params: {
    actorId: string;
    actorName?: string;
    actorRole: Role;
    action: string;
    targetType: string;
    targetId?: string;
    beforeValue?: any;
    afterValue?: any;
    metadata?: any;
  }) {
    return this.databaseService.auditLog.create({
      data: {
        actorId: params.actorId,
        actorName: params.actorName,
        actorRole: params.actorRole,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        beforeValue: params.beforeValue ?? undefined,
        afterValue: params.afterValue ?? undefined,
        metadata: params.metadata ?? undefined,
      },
    });
  }

  async query(params: {
    actorId?: string;
    action?: string;
    targetType?: string;
    targetId?: string;
    fromDate?: Date;
    toDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const { actorId, action, targetType, targetId, fromDate, toDate, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (actorId) where.actorId = actorId;
    if (action) where.action = action;
    if (targetType) where.targetType = targetType;
    if (targetId) where.targetId = targetId;
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = fromDate;
      if (toDate) where.createdAt.lte = toDate;
    }

    const [data, total] = await Promise.all([
      this.databaseService.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.databaseService.auditLog.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
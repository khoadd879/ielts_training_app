import { Injectable, Inject, BadRequestException, forwardRef } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { DatabaseService } from 'src/database/database.service';
import { AssignMode, Role } from '@prisma/client';
import { AuditLogService } from 'src/module/audit-log/audit-log.service';

@Injectable()
export class SystemConfigService {
  private readonly MODERATION_POLICY_KEY = 'moderation_policy';
  private readonly DEFAULT_MODERATION_POLICY = {
    autoApproveThreshold: 80,
    autoRejectThreshold: 20,
    blockedWords: ['casino', 'đặt cược', 'kiếm tiền nhanh', 'free money', 'click link', 'airdrop', 'telegram'],
    reviewSlaHours: 24,
  };
  private readonly CACHE_TTL = 300000; // 5 minutes in ms

  constructor(
    private readonly databaseService: DatabaseService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Inject(forwardRef(() => AuditLogService)) private readonly auditLogService?: AuditLogService,
  ) {}

  async getConfig(key: string): Promise<any> {
    const cacheKey = `system_config:${key}`;
    const cached = await this.cacheManager.get<any>(cacheKey);
    if (cached !== undefined && cached !== null) {
      return cached;
    }

    const config = await this.databaseService.systemConfig.findUnique({
      where: { idConfig: key },
    });
    const value = config?.value;

    // Cache for 5 minutes
    await this.cacheManager.set(cacheKey, value, this.CACHE_TTL);
    return value;
  }

  async setConfig(key: string, value: any): Promise<void> {
    await this.databaseService.systemConfig.upsert({
      where: { idConfig: key },
      update: { value },
      create: { idConfig: key, value },
    });
    // Invalidate cache
    const cacheKey = `system_config:${key}`;
    await this.cacheManager.del(cacheKey);
  }

  async getCommission(): Promise<{ writing: number; speaking: number }> {
    const value = await this.getConfig('teacher_review_commission');
    return (
      value || {
        writing: 50000,
        speaking: 40000,
      }
    );
  }

  async setCommission(
    commission: { writing: number; speaking: number },
    actorId?: string,
    actorName?: string,
    actorRole?: Role,
  ): Promise<void> {
    const before = await this.getCommission();
    await this.setConfig('teacher_review_commission', commission);

    if (this.auditLogService && actorId) {
      await this.auditLogService.createEntry({
        actorId,
        actorName,
        actorRole: actorRole || Role.ADMIN,
        action: 'COMMISSION_UPDATE',
        targetType: 'SystemConfig',
        targetId: 'teacher_review_commission',
        beforeValue: before,
        afterValue: commission,
      });
    }
  }

  async getAssignMode(): Promise<AssignMode> {
    const config = await this.databaseService.systemConfig.findUnique({
      where: { idConfig: 'assign_mode' },
    });
    
    if (!config || !config.assignMode) {
      return AssignMode.MANUAL;
    }
    
    return config.assignMode;
  }

  async setAssignMode(mode: AssignMode): Promise<void> {
    // Validate enum - only AUTO or MANUAL allowed
    if (mode !== AssignMode.AUTO && mode !== AssignMode.MANUAL) {
      throw new BadRequestException(
        `Invalid assign mode: ${mode}. Allowed values: AUTO, MANUAL`,
      );
    }

    // Update using upsert with assignMode enum field
    await this.databaseService.systemConfig.upsert({
      where: { idConfig: 'assign_mode' },
      update: { assignMode: mode },
      create: {
        idConfig: 'assign_mode',
        value: {},
        assignMode: mode
      },
    });
  }

  async getModerationPolicy(): Promise<{
    autoApproveThreshold: number;
    autoRejectThreshold: number;
    blockedWords: string[];
    reviewSlaHours: number;
  }> {
    const value = await this.getConfig(this.MODERATION_POLICY_KEY);
    return value || this.DEFAULT_MODERATION_POLICY;
  }

  async setModerationPolicy(
    policy: {
      autoApproveThreshold: number;
      autoRejectThreshold: number;
      blockedWords: string[];
      reviewSlaHours: number;
    },
    actorId?: string,
    actorName?: string,
    actorRole?: Role,
  ): Promise<void> {
    // Validation
    if (policy.autoRejectThreshold >= policy.autoApproveThreshold) {
      throw new BadRequestException('autoRejectThreshold must be less than autoApproveThreshold');
    }
    if (policy.autoApproveThreshold < 0 || policy.autoApproveThreshold > 100) {
      throw new BadRequestException('autoApproveThreshold must be between 0 and 100');
    }
    if (policy.autoRejectThreshold < 0 || policy.autoRejectThreshold > 100) {
      throw new BadRequestException('autoRejectThreshold must be between 0 and 100');
    }

    const before = await this.getModerationPolicy();
    await this.setConfig(this.MODERATION_POLICY_KEY, policy);

    if (this.auditLogService && actorId) {
      await this.auditLogService.createEntry({
        actorId,
        actorName,
        actorRole: actorRole || Role.ADMIN,
        action: 'MODERATION_POLICY_UPDATE',
        targetType: 'SystemConfig',
        targetId: this.MODERATION_POLICY_KEY,
        beforeValue: before,
        afterValue: policy,
      });
    }
  }
}

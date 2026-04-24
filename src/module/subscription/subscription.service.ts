import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(private readonly db: DatabaseService) {}

  // ===== Package Operations =====

  async getActivePackages() {
    return this.db.subscriptionPackage.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createPackage(dto: any) {
    return this.db.subscriptionPackage.create({ data: dto });
  }

  // ===== Subscription Operations =====

  async getUserSubscription(idUser: string) {
    const sub = await this.db.userSubscription.findFirst({
      where: { idUser, status: 'ACTIVE' },
      include: { package: true },
    });
    return sub;
  }

  async subscribe(idUser: string, dto: any) {
    const pkg = await this.db.subscriptionPackage.findUnique({
      where: { idPackage: dto.idPackage },
    });

    if (!pkg || !pkg.isActive) {
      throw new NotFoundException('Subscription package not found or inactive');
    }

    // Calculate billing period
    const now = new Date();
    const expiresAt = new Date(now);
    if (pkg.billingCycle === 'MONTHLY') {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    } else {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    }

    // Use transaction to ensure atomicity
    return this.db.$transaction(async (tx) => {
      // Cancel any existing active subscription
      await tx.userSubscription.updateMany({
        where: { idUser, status: 'ACTIVE' },
        data: { status: 'CANCELLED' },
      });

      // Create new subscription
      const subscription = await tx.userSubscription.create({
        data: {
          idUser,
          idPackage: pkg.idPackage,
          status: 'ACTIVE',
          startedAt: now,
          expiresAt,
          nextBillingAt: dto.autoRenew ? expiresAt : null,
          autoRenew: dto.autoRenew ?? true,
          creditsQuotaThisPeriod: pkg.creditsQuota,
          creditsUsedThisPeriod: 0,
          paymentRef: dto.paymentRef,
          paymentMethod: dto.paymentMethod,
        },
        include: { package: true },
      });

      return subscription;
    });
  }

  // ===== Quota Check (used by submission flow) =====

  async checkQuota(idUser: string): Promise<{ hasQuota: boolean; remaining: number; isUnlimited: boolean }> {
    const sub = await this.db.userSubscription.findFirst({
      where: { idUser, status: 'ACTIVE' },
      include: { package: true },
    });

    if (!sub) {
      return { hasQuota: false, remaining: 0, isUnlimited: false };
    }

    // Check if expired
    if (new Date() > sub.expiresAt) {
      return { hasQuota: false, remaining: 0, isUnlimited: false };
    }

    // Unlimited check
    if (sub.creditsQuotaThisPeriod === 0) {
      return { hasQuota: true, remaining: -1, isUnlimited: true };
    }

    const remaining = sub.creditsQuotaThisPeriod - sub.creditsUsedThisPeriod;
    return {
      hasQuota: remaining > 0,
      remaining,
      isUnlimited: false,
    };
  }

  async useQuota(idUser: string, credits: number = 1): Promise<{ success: boolean; remaining: number }> {
    return this.db.$transaction(async (tx) => {
      const sub = await tx.userSubscription.findFirst({
        where: { idUser, status: 'ACTIVE' },
        include: { package: true },
      });

      if (!sub) {
        throw new BadRequestException('No active subscription found');
      }

      if (new Date() > sub.expiresAt) {
        throw new BadRequestException('Subscription expired');
      }

      if (sub.creditsQuotaThisPeriod > 0) {
        const remaining = sub.creditsQuotaThisPeriod - sub.creditsUsedThisPeriod;
        if (remaining < credits) {
          throw new BadRequestException(`Insufficient quota. Need ${credits}, have ${remaining}`);
        }

        await tx.userSubscription.update({
          where: { idSubscription: sub.idSubscription },
          data: { creditsUsedThisPeriod: sub.creditsUsedThisPeriod + credits },
        });

        return { success: true, remaining: remaining - credits };
      }

      return { success: true, remaining: -1 }; // Unlimited
    });
  }

  // ===== Refund Quota (for grading failure) =====

  async refundQuota(idUser: string, credits: number = 1): Promise<{ success: boolean }> {
    const sub = await this.db.userSubscription.findFirst({
      where: { idUser, status: 'ACTIVE' },
    });

    if (sub && sub.creditsUsedThisPeriod > 0) {
      await this.db.userSubscription.update({
        where: { idSubscription: sub.idSubscription },
        data: {
          creditsUsedThisPeriod: Math.max(0, sub.creditsUsedThisPeriod - credits),
        },
      });
    }

    return { success: true };
  }

  // ===== Subscription Management =====

  async cancelSubscription(idUser: string) {
    return this.db.userSubscription.updateMany({
      where: { idUser, status: 'ACTIVE' },
      data: { status: 'CANCELLED', autoRenew: false },
    });
  }

  async renewSubscription(idSubscription: string) {
    const sub = await this.db.userSubscription.findUnique({
      where: { idSubscription },
      include: { package: true },
    });

    if (!sub || sub.status !== 'ACTIVE') {
      throw new NotFoundException('Active subscription not found');
    }

    const now = new Date();
    const nextExpires = new Date(sub.expiresAt);
    const nextBilling = new Date(sub.expiresAt);

    if (sub.package.billingCycle === 'MONTHLY') {
      nextExpires.setMonth(nextExpires.getMonth() + 1);
      nextBilling.setMonth(nextBilling.getMonth() + 1);
    } else {
      nextExpires.setFullYear(nextExpires.getFullYear() + 1);
      nextBilling.setFullYear(nextBilling.getFullYear() + 1);
    }

    return this.db.userSubscription.update({
      where: { idSubscription },
      data: {
        expiresAt: nextExpires,
        nextBillingAt: sub.autoRenew ? nextBilling : null,
        creditsUsedThisPeriod: 0, // Reset quota
      },
    });
  }

  // ===== Admin Operations =====

  async adminCreateSubscription(idUser: string, idPackage: string, durationDays: number) {
    const pkg = await this.db.subscriptionPackage.findUnique({
      where: { idPackage },
    });

    if (!pkg) {
      throw new NotFoundException('Package not found');
    }

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    return this.db.userSubscription.create({
      data: {
        idUser,
        idPackage: pkg.idPackage,
        status: 'ACTIVE',
        startedAt: now,
        expiresAt,
        autoRenew: false,
        creditsQuotaThisPeriod: pkg.creditsQuota,
        creditsUsedThisPeriod: 0,
        paymentMethod: 'ADMIN_CREDIT',
        paymentRef: `admin-grant-${Date.now()}`,
      },
      include: { package: true },
    });
  }
}
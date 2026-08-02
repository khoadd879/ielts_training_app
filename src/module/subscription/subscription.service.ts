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

  /**
   * Internal: activate a subscription from a verified PaymentTransaction.
   * Must be called inside a Prisma `$transaction` so the same `tx` is shared
   * with PaymentService — atomicity is the caller's responsibility.
   */
  async activateFromPayment(
    tx: any,
    payment: {
      idTransaction: string;
      idUser: string;
      idSubscriptionPackage: string | null;
    },
  ): Promise<{ idSubscription: string }> {
    if (!payment.idSubscriptionPackage) {
      throw new BadRequestException('Payment has no subscription package');
    }

    const pkg = await tx.subscriptionPackage.findUnique({
      where: { idPackage: payment.idSubscriptionPackage },
    });
    if (!pkg) {
      throw new NotFoundException('Subscription package vanished');
    }

    const now = new Date();
    const expiresAt = new Date(now);
    if (pkg.billingCycle === 'MONTHLY') {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    } else {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    }

    await tx.userSubscription.updateMany({
      where: { idUser: payment.idUser, status: 'ACTIVE' },
      data: { status: 'CANCELLED' },
    });

    const sub = await tx.userSubscription.create({
      data: {
        idUser: payment.idUser,
        idPackage: pkg.idPackage,
        status: 'ACTIVE',
        startedAt: now,
        expiresAt,
        nextBillingAt: null,
        autoRenew: false,
        creditsQuotaThisPeriod: pkg.creditsQuota,
        creditsUsedThisPeriod: 0,
        paymentRef: payment.idTransaction,
        paymentMethod: 'VNPAY',
      },
    });

    return { idSubscription: sub.idSubscription };
  }

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
      // Atomic claim: increment only if an active, non-expired subscription exists
      const { count } = await tx.userSubscription.updateMany({
        where: {
          idUser,
          status: 'ACTIVE',
          expiresAt: { gt: new Date() },
        },
        data: { creditsUsedThisPeriod: { increment: credits } },
      });
      if (count === 0) {
        throw new BadRequestException('No active subscription or expired');
      }

      // Verify we didn't over-quota under concurrent deduction
      const sub = await tx.userSubscription.findFirst({
        where: { idUser, status: 'ACTIVE' },
      });
      if (!sub) {
        throw new BadRequestException('No active subscription found');
      }

      if (
        sub.creditsQuotaThisPeriod > 0 &&
        sub.creditsUsedThisPeriod > sub.creditsQuotaThisPeriod
      ) {
        // Rollback
        await tx.userSubscription.update({
          where: { idSubscription: sub.idSubscription },
          data: { creditsUsedThisPeriod: { decrement: credits } },
        });
        throw new BadRequestException(`Insufficient quota. Need ${credits}`);
      }

      return {
        success: true,
        remaining:
          sub.creditsQuotaThisPeriod > 0
            ? sub.creditsQuotaThisPeriod - sub.creditsUsedThisPeriod
            : -1,
      };
    });
  }

  // ===== Refund Quota (for grading failure) =====

  async refundQuota(idUser: string, credits: number = 1): Promise<{ success: boolean }> {
    // Idempotent decrement: only restore if enough used credits remain
    await this.db.userSubscription.updateMany({
      where: {
        idUser,
        status: 'ACTIVE',
        creditsUsedThisPeriod: { gte: credits },
      },
      data: { creditsUsedThisPeriod: { decrement: credits } },
    });
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

    const nextExpires = new Date(sub.expiresAt);
    const nextBilling = new Date(sub.expiresAt);

    if (sub.package.billingCycle === 'MONTHLY') {
      nextExpires.setMonth(nextExpires.getMonth() + 1);
      nextBilling.setMonth(nextBilling.getMonth() + 1);
    } else {
      nextExpires.setFullYear(nextExpires.getFullYear() + 1);
      nextBilling.setFullYear(nextBilling.getFullYear() + 1);
    }

    // Atomic claim: only renew if still ACTIVE (race-safe vs cancel)
    const { count } = await this.db.userSubscription.updateMany({
      where: { idSubscription, status: 'ACTIVE' },
      data: {
        expiresAt: nextExpires,
        nextBillingAt: sub.autoRenew ? nextBilling : null,
        creditsUsedThisPeriod: 0,
      },
    });
    if (count === 0) {
      throw new NotFoundException('Subscription no longer active (race)');
    }
    return this.db.userSubscription.findUnique({ where: { idSubscription } });
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
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { PurchaseCreditsDto } from './dto/purchase-credit.dto';

@Injectable()
export class CreditsService {
  private readonly logger = new Logger(CreditsService.name);

  constructor(private readonly db: DatabaseService) {}

  // ===== Balance Operations =====

  async getBalance(idUser: string) {
    let balance = await this.db.creditBalance.findUnique({
      where: { idUser },
    });

    if (!balance) {
      // Auto-create balance with 0 credits
      balance = await this.db.creditBalance.create({
        data: { idUser, totalCredits: 0, usedCredits: 0 },
      });
    }

    return {
      idUser: balance.idUser,
      totalCredits: balance.totalCredits,
      usedCredits: balance.usedCredits,
      availableCredits: balance.totalCredits - balance.usedCredits,
    };
  }

  // ===== Package Operations =====

  async getActivePackages() {
    return this.db.creditPackage.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getPackage(idPackage: string) {
    return this.db.creditPackage.findUnique({
      where: { idPackage },
    });
  }

  async createPackage(dto: any) {
    return this.db.creditPackage.create({ data: dto });
  }

  // ===== Transaction Operations =====

  async purchaseCredits(idUser: string, dto: PurchaseCreditsDto) {
    const pkg = await this.db.creditPackage.findUnique({
      where: { idPackage: dto.idPackage },
    });

    if (!pkg || !pkg.isActive) {
      throw new NotFoundException('Credit package not found or inactive');
    }

    // Use transaction to ensure atomicity
    return this.db.$transaction(async (tx) => {
      // Create or update balance
      let balance = await tx.creditBalance.findUnique({ where: { idUser } });
      if (!balance) {
        balance = await tx.creditBalance.create({
          data: { idUser, totalCredits: 0, usedCredits: 0 },
        });
      }

      // Update balance
      balance = await tx.creditBalance.update({
        where: { idUser },
        data: { totalCredits: balance.totalCredits + pkg.creditAmount },
      });

      // Create transaction record
      const transaction = await tx.creditTransaction.create({
        data: {
          idUser,
          idPackage: pkg.idPackage,
          creditsAmount: pkg.creditAmount,
          transactionType: 'PURCHASE',
          description: `Purchased ${pkg.name}`,
          status: 'COMPLETED',
        },
      });

      return {
        transactionId: transaction.idTransaction,
        balance: {
          totalCredits: balance.totalCredits,
          usedCredits: balance.usedCredits,
          availableCredits: balance.totalCredits - balance.usedCredits,
        },
      };
    });
  }

  // ===== Credit Deduction (used by writing/speaking submission) =====

  async deductCredit(params: {
    idUser: string;
    type: 'WRITING' | 'SPEAKING';
    submissionId: string;
    creditsCost: number;
  }): Promise<{ success: boolean; balance: number; transactionId?: string }> {
    const { idUser, type, submissionId, creditsCost } = params;

    return this.db.$transaction(async (tx) => {
      let balance = await tx.creditBalance.findUnique({ where: { idUser } });

      if (!balance) {
        throw new BadRequestException('No credit balance found. Please purchase credits first.');
      }

      const available = balance.totalCredits - balance.usedCredits;
      if (available < creditsCost) {
        throw new BadRequestException(
          `Insufficient credits. Need ${creditsCost}, have ${available}`,
        );
      }

      // Reserve credits (increase usedCredits)
      balance = await tx.creditBalance.update({
        where: { idUser },
        data: { usedCredits: balance.usedCredits + creditsCost },
      });

      // Create transaction
      const transaction = await tx.creditTransaction.create({
        data: {
          idUser,
          creditsAmount: creditsCost,
          transactionType: type === 'WRITING' ? 'USED_WRITING' : 'USED_SPEAKING',
          idWritingSubmission: type === 'WRITING' ? submissionId : undefined,
          idSpeakingSubmission: type === 'SPEAKING' ? submissionId : undefined,
          description: `${type} submission`,
          status: 'COMPLETED',
        },
      });

      return {
        success: true,
        balance: balance.totalCredits - balance.usedCredits,
        transactionId: transaction.idTransaction,
      };
    });
  }

  // ===== Refund (used by grading worker on FAIL) =====

  async refundCredit(params: {
    idUser: string;
    type: 'WRITING' | 'SPEAKING';
    submissionId: string;
  }): Promise<{ success: boolean; balance: number }> {
    const { idUser, type, submissionId } = params;

    // Find the original transaction
    const filter =
      type === 'WRITING'
        ? { idWritingSubmission: submissionId }
        : { idSpeakingSubmission: submissionId };

    const originalTx = await this.db.creditTransaction.findFirst({
      where: { ...filter, transactionType: type === 'WRITING' ? 'USED_WRITING' : 'USED_SPEAKING' },
    });

    if (!originalTx) {
      this.logger.warn(`No original transaction found for ${type} submission ${submissionId}`);
      return { success: false, balance: 0 };
    }

    return this.db.$transaction(async (tx) => {
      let balance = await tx.creditBalance.findUnique({ where: { idUser } });

      if (!balance) {
        throw new NotFoundException('Credit balance not found');
      }

      // Restore credits
      balance = await tx.creditBalance.update({
        where: { idUser },
        data: { usedCredits: Math.max(0, balance.usedCredits - originalTx.creditsAmount) },
      });

      // Mark original transaction as refunded and create refund record
      await tx.creditTransaction.update({
        where: { idTransaction: originalTx.idTransaction },
        data: { status: 'CANCELLED' },
      });

      await tx.creditTransaction.create({
        data: {
          idUser,
          creditsAmount: originalTx.creditsAmount,
          transactionType: 'REFUND',
          idWritingSubmission: type === 'WRITING' ? submissionId : undefined,
          idSpeakingSubmission: type === 'SPEAKING' ? submissionId : undefined,
          description: `Refund for failed ${type} grading`,
          status: 'COMPLETED',
        },
      });

      return {
        success: true,
        balance: balance.totalCredits - balance.usedCredits,
      };
    });
  }

  // ===== Admin: Adjust Balance =====

  async adminAdjustBalance(idUser: string, amount: number, reason: string) {
    return this.db.$transaction(async (tx) => {
      let balance = await tx.creditBalance.findUnique({ where: { idUser } });

      if (!balance) {
        balance = await tx.creditBalance.create({
          data: { idUser, totalCredits: 0, usedCredits: 0 },
        });
      }

      const newTotal = Math.max(0, balance.totalCredits + amount);

      balance = await tx.creditBalance.update({
        where: { idUser },
        data: { totalCredits: newTotal },
      });

      await tx.creditTransaction.create({
        data: {
          idUser,
          creditsAmount: Math.abs(amount),
          transactionType: 'ADMIN_ADJUST',
          description: reason,
          status: 'COMPLETED',
        },
      });

      return {
        idUser,
        totalCredits: balance.totalCredits,
        availableCredits: balance.totalCredits - balance.usedCredits,
      };
    });
  }
}
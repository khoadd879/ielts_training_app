# Credits + Subscription System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng hệ thống Credits/Wallet và Subscription để kiểm soát việc sử dụng AI grading, làm nền tảng cho monetization.

**Architecture:**
- Credits (Pay-as-you-go): Mua credits → dùng → hết mua thêm
- Subscription: Trả phí định kỳ → được quota credits/tháng hoặc không giới hạn

**Models mới:**
- CreditPackage, CreditBalance, CreditTransaction (Credits)
- SubscriptionPackage, UserSubscription (Subscription)

**Services:**
- CreditsService: check balance, deduct, refund
- SubscriptionService: manage subscriptions, quota tracking
- VnpayService: VNPay payment gateway integration

**Payment Gateway:**
- VNPay Sandbox: `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html`
- VNPay Query/Refund API: `https://sandbox.vnpayment.vn/merchant_webapi/api/transaction`
- Supports: ATM, QRCODE, Internet Banking

---

## File Structure

```
prisma/schema.prisma                              # Add Credit + Subscription models
src/database/database.module.ts                  # Export services
src/database/database.service.ts                 # Add Prisma references for new models
src/module/credits/                              # Credits module
  credits.module.ts
  credits.controller.ts
  credits.service.ts
  dto/
    create-credit-package.dto.ts
    purchase-credit.dto.ts
src/module/subscription/                         # NEW: Subscription module
  subscription.module.ts
  subscription.controller.ts
  subscription.service.ts
  dto/
    create-subscription-package.dto.ts
    subscribe.dto.ts
src/module/payment/                              # NEW: VNPay integration
  payment.module.ts
  payment.controller.ts
  payment.service.ts
  payment.utils.ts
  dto/
    create-payment.dto.ts
    vnpay-return.dto.ts
src/module/user-writing-submission/              # MODIFY - integrate credits check
  user-writing-submission.service.ts
src/module/user-speaking-submission/              # MODIFY - integrate credits check
  user-speaking-submission.service.ts
ai-workers/grading-worker/write.handler.ts        # MODIFY - refund on FAIL
ai-workers/grading-worker/speak.handler.ts        # MODIFY - refund on FAIL
```

---

## Task 1: Prisma Schema - Add Credit Models

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add CreditPackage model**

Locate line 505 (after Role enum) and add:

```prisma
// ============================================================================
// CREDITS & MONETIZATION
// ============================================================================

model CreditPackage {
  idPackage    String   @id @default(uuid())
  name         String   @unique
  description  String?
  creditAmount Int
  price        Float
  priceUnit    String   @default("VND") // VND, USD
  isActive     Boolean @default(true)
  sortOrder    Int     @default(0)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  // Relations
  transactions CreditTransaction[]

  @@index([isActive, sortOrder])
}

model CreditBalance {
  idUser        String @id @default(uuid())
  idUser        String @unique
  totalCredits  Int    @default(0)
  usedCredits   Int    @default(0)
  frozenCredits Int    @default(0) // Reserved for pending submissions

  // Relations
  user         User                 @relation(fields: [idUser], references: [idUser], onDelete: Cascade)
  transactions CreditTransaction[]

  @@index([idUser])
}

model CreditTransaction {
  idTransaction      String              @id @default(uuid())
  idUser             String
  idPackage          String?
  creditsAmount      Int
  transactionType    CreditTransType
  description        String?
  idWritingSubmission String?
  idSpeakingSubmission String?
  status             CreditTransStatus @default(PENDING)
  createdAt          DateTime           @default(now())

  // Relations
  user               User             @relation(fields: [idUser], references: [idUser], onDelete: Cascade)
  package            CreditPackage?   @relation(fields: [idPackage], references: [idPackage])

  @@index([idUser, createdAt])
  @@index([transactionType, createdAt])
}

enum CreditTransType {
  PURCHASE       // User mua package
  USED_WRITING   // Dùng cho writing submission
  USED_SPEAKING  // Dùng cho speaking submission
  REFUND         // Hoàn credit (grading fail)
  EXPIRY         // Credit hết hạn
  BONUS          // Credit bonus (promotion, referral)
  ADMIN_ADJUST   // Admin điều chỉnh
}

enum CreditTransStatus {
  PENDING   // Đang xử lý
  COMPLETED // Hoàn tất
  FAILED    // Thất bại
  CANCELLED // Bị hủy
}

// ============================================================================
// SUBSCRIPTION (Pay-as-you-go credits + Subscription tiers)
// ============================================================================

model SubscriptionPackage {
  idPackage       String   @id @default(uuid())
  name            String   @unique // "Monthly Pro", "Annual Premium"
  description     String?
  billingCycle    BillingCycle @default(MONTHLY) // MONTHLY, ANNUAL
  price           Float
  priceUnit       String   @default("VND")
  creditsQuota    Int      @default(0) // 0 = unlimited
  features        String[] // ["AI Writing", "AI Speaking", "Priority Queue"]
  badge           String?  // "Popular", "Best Value"
  isActive        Boolean  @default(true)
  isFeatured      Boolean  @default(false)
  sortOrder       Int      @default(0)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  subscriptions   UserSubscription[]

  @@index([isActive, sortOrder])
  @@index([billingCycle])
}

model UserSubscription {
  idSubscription      String            @id @default(uuid())
  idUser              String
  idPackage           String
  status              SubscriptionStatus @default(ACTIVE)
  startedAt           DateTime          @default(now())
  expiresAt           DateTime          // End of billing period
  nextBillingAt       DateTime?         // For recurring billing
  autoRenew           Boolean           @default(true)
  
  // Quota tracking (for limited subscriptions)
  creditsUsedThisPeriod Int              @default(0)
  creditsQuotaThisPeriod Int             @default(0)

  // Payment
  paymentRef          String?           // Payment gateway reference
  paymentMethod       PaymentMethod?     // MOMO, VNPAY, STRIPE, etc.

  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt

  // Relations
  user               User              @relation(fields: [idUser], references: [idUser], onDelete: Cascade)
  package            SubscriptionPackage @relation(fields: [idPackage], references: [idPackage])

  @@index([idUser, status])
  @@index([expiresAt])
}

enum BillingCycle {
  MONTHLY
  ANNUAL
}

enum SubscriptionStatus {
  ACTIVE      // Đang sử dụng, quota còn
  EXPIRED     // Hết hạn (không renew được)
  CANCELLED   // User hủy
  SUSPENDED   // Admin suspend
}

enum PaymentMethod {
  MOMO
  VNPAY
  STRIPE
  BANK_TRANSFER
  ADMIN_CREDIT // Admin tặng
}

- [ ] **Step 2: Add relations to existing User model**

Find the User model (line 14) and add after forumCommentLikes relation:

```prisma
  // Credits
  creditBalance       CreditBalance?
  creditTransactions  CreditTransaction[]

  // Subscriptions
  subscriptions        UserSubscription[]
```

- [ ] **Step 3: Add relations to UserWritingSubmission model**

Find UserWritingSubmission model (line 287) and add after testResult relation:

```prisma
  // Credits
  creditTransaction CreditTransaction? @relation(fields: [idCreditTransaction], references: [idCreditTransaction])
  idCreditTransaction String?
```

- [ ] **Step 4: Add relations to UserSpeakingSubmission model**

Find UserSpeakingSubmission model (line 315) and add after testResult relation:

```prisma
  // Credits
  creditTransaction CreditTransaction? @relation(fields: [idCreditTransaction], references: [idCreditTransaction])
  idCreditTransaction String?
```

- [ ] **Step 5: Run Prisma migration**

Run: `cd /home/khoa/Documents/ielts_training_app && npx prisma migrate dev --name add_credit_subscription_models`
Expected: Migration creates 6 new tables (CreditPackage, CreditBalance, CreditTransaction, SubscriptionPackage, UserSubscription, plus join table if needed)

- [ ] **Step 6: Commit**

```bash
cd /home/khoa/Documents/ielts_training_app
git add prisma/migrations/ prisma/schema.prisma
git commit -m "feat: add credit and subscription models"
```

---

## Task 2: Database Service - Add Prisma References

**Files:**
- Modify: `src/database/database.service.ts`

- [ ] **Step 1: Read current database.service.ts**

- [ ] **Step 2: Add new model references**

Find the `constructor` or model accessors section. Add after `userWritingSubmission`:

```typescript
// Credits
public creditPackage: Prisma.CreditPackageDelegate<'rejectOnNotFound'>;
public creditBalance: Prisma.CreditBalanceDelegate<'rejectOnNotFound'>;
public creditTransaction: Prisma.CreditTransactionDelegate<'rejectOnNotFound'>;

// Subscriptions
public subscriptionPackage: Prisma.SubscriptionPackageDelegate<'rejectOnNotFound'>;
public userSubscription: Prisma.UserSubscriptionDelegate<'rejectOnNotFound'>;
```

- [ ] **Step 3: Add in constructor**

Find where other models are assigned and add:

```typescript
this.creditPackage = prisma.creditPackage;
this.creditBalance = prisma.creditBalance;
this.creditTransaction = prisma.creditTransaction;
this.subscriptionPackage = prisma.subscriptionPackage;
this.userSubscription = prisma.userSubscription;
```

- [ ] **Step 4: Commit**

```bash
git add src/database/database.service.ts
git commit -m "feat: add credit and subscription model references to database service"
```

---

## Task 3: Credits Module, Controller, Service

**Files:**
- Create: `src/module/credits/credits.module.ts`
- Create: `src/module/credits/credits.controller.ts`
- Create: `src/module/credits/credits.service.ts`
- Create: `src/module/credits/dto/create-credit-package.dto.ts`
- Create: `src/module/credits/dto/purchase-credit.dto.ts`

- [ ] **Step 1: Create credits.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { CreditsService } from './credits.service';
import { CreditsController } from './credits.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [CreditsController],
  providers: [CreditsService],
  exports: [CreditsService],
})
export class CreditsModule {}
```

- [ ] **Step 2: Create create-credit-package.dto.ts**

```typescript
import { IsString, IsNumber, IsBoolean, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCreditPackageDto {
  @ApiProperty({ example: '10 AI Grading Credits' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Perfect for trying out AI grading', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(1)
  creditAmount: number;

  @ApiProperty({ example: 50000 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 'VND', required: false })
  @IsString()
  @IsOptional()
  priceUnit?: string;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ example: 1, required: false })
  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}
```

- [ ] **Step 3: Create purchase-credit.dto.ts**

```typescript
import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PurchaseCreditsDto {
  @ApiProperty()
  @IsUUID()
  idPackage: string;

  @ApiProperty({ description: 'Payment reference (from payment gateway)' })
  @IsString()
  paymentRef: string;
}
```

- [ ] **Step 4: Create credits.service.ts**

```typescript
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
```

- [ ] **Step 5: Create credits.controller.ts**

```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/passport/jwt-auth.guard';
import { CreditsService } from './credits.service';
import { CreateCreditPackageDto } from './dto/create-credit-package.dto';
import { PurchaseCreditsDto } from './dto/purchase-credit.dto';
import { RolesGuard } from 'src/auth/passport/jwt-auth.guard';
import { Roles } from 'src/decorator/customize';
import { Role } from '@prisma/client';

@Controller('credits')
@UseGuards(JwtAuthGuard)
export class CreditsController {
  constructor(private readonly creditsService: CreditsService) {}

  // ===== User Routes =====

  @Get('balance')
  async getBalance(@Request() req: any) {
    const { idUser } = req.user;
    return this.creditsService.getBalance(idUser);
  }

  @Get('packages')
  async getPackages() {
    return this.creditsService.getActivePackages();
  }

  @Post('purchase')
  async purchaseCredits(
    @Request() req: any,
    @Body() dto: PurchaseCreditsDto,
  ) {
    const { idUser } = req.user;
    return this.creditsService.purchaseCredits(idUser, dto);
  }

  // ===== Admin Routes =====

  @Post('packages')
  @Roles(Role.ADMIN)
  async createPackage(@Body() dto: CreateCreditPackageDto) {
    return this.creditsService.createPackage(dto);
  }

  @Post('admin/adjust')
  @Roles(Role.ADMIN)
  async adjustBalance(
    @Body() body: { idUser: string; amount: number; reason: string },
  ) {
    return this.creditsService.adminAdjustBalance(body.idUser, body.amount, body.reason);
  }
}
```

- [ ] **Step 6: Add to app.module.ts**

Find `UserWritingSubmissionModule` import and add after it:

```typescript
import { CreditsModule } from './module/credits/credits.module';
```

Find the imports array and add before RabbitMQModule:

```typescript
CreditsModule,
```

- [ ] **Step 7: Commit**

```bash
git add src/module/credits/
git add src/database/database.service.ts
git add src/app.module.ts
git commit -m "feat: add credits module with balance, packages, and transactions"
```

---

## Task 3b: Subscription Module, Controller, Service

**Files:**
- Create: `src/module/subscription/subscription.module.ts`
- Create: `src/module/subscription/subscription.controller.ts`
- Create: `src/module/subscription/subscription.service.ts`
- Create: `src/module/subscription/dto/create-subscription-package.dto.ts`
- Create: `src/module/subscription/dto/subscribe.dto.ts`

- [ ] **Step 1: Create subscription.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [SubscriptionController],
  providers: [SubscriptionService],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
```

- [ ] **Step 2: Create create-subscription-package.dto.ts**

```typescript
import { IsString, IsNumber, IsBoolean, IsOptional, IsArray, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSubscriptionPackageDto {
  @ApiProperty({ example: 'Monthly Pro' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Access to all AI grading features', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'MONTHLY', enum: ['MONTHLY', 'ANNUAL'] })
  @IsString()
  billingCycle: string;

  @ApiProperty({ example: 199000 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 'VND', required: false })
  @IsString()
  @IsOptional()
  priceUnit?: string;

  @ApiProperty({ example: 30, description: '0 = unlimited' })
  @IsNumber()
  @Min(0)
  creditsQuota: number;

  @ApiProperty({ example: ['AI Writing', 'AI Speaking', 'Priority Queue'] })
  @IsArray()
  @IsOptional()
  features?: string[];

  @ApiProperty({ example: 'Popular', required: false })
  @IsString()
  @IsOptional()
  badge?: string;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiProperty({ example: 1, required: false })
  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}
```

- [ ] **Step 3: Create subscribe.dto.ts**

```typescript
import { IsString, IsUUID, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubscribeDto {
  @ApiProperty()
  @IsUUID()
  idPackage: string;

  @ApiProperty({ description: 'Payment reference (from payment gateway)' })
  @IsString()
  paymentRef: string;

  @ApiProperty({ enum: ['MOMO', 'VNPAY', 'STRIPE', 'BANK_TRANSFER'] })
  @IsString()
  paymentMethod: string;

  @ApiProperty({ description: 'Auto-renew subscription', required: false })
  @IsOptional()
  autoRenew?: boolean;
}
```

- [ ] **Step 4: Create subscription.service.ts**

```typescript
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
```

- [ ] **Step 5: Create subscription.controller.ts**

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/passport/jwt-auth.guard';
import { SubscriptionService } from './subscription.service';
import { CreateSubscriptionPackageDto } from './dto/create-subscription-package.dto';
import { SubscribeDto } from './dto/subscribe.dto';
import { Roles } from 'src/decorator/customize';
import { Role } from '@prisma/client';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  // ===== User Routes =====

  @Get('current')
  async getCurrentSubscription(@Request() req: any) {
    const { idUser } = req.user;
    return this.subscriptionService.getUserSubscription(idUser);
  }

  @Get('packages')
  async getPackages() {
    return this.subscriptionService.getActivePackages();
  }

  @Post('subscribe')
  async subscribe(
    @Request() req: any,
    @Body() dto: SubscribeDto,
  ) {
    const { idUser } = req.user;
    return this.subscriptionService.subscribe(idUser, dto);
  }

  @Put('cancel')
  async cancel(@Request() req: any) {
    const { idUser } = req.user;
    return this.subscriptionService.cancelSubscription(idUser);
  }

  // ===== Admin Routes =====

  @Post('packages')
  @Roles(Role.ADMIN)
  async createPackage(@Body() dto: CreateSubscriptionPackageDto) {
    return this.subscriptionService.createPackage(dto);
  }

  @Post('admin/grant')
  @Roles(Role.ADMIN)
  async adminGrantSubscription(
    @Body() body: { idUser: string; idPackage: string; durationDays: number },
  ) {
    return this.subscriptionService.adminCreateSubscription(
      body.idUser,
      body.idPackage,
      body.durationDays,
    );
  }
}
```

- [ ] **Step 6: Add to app.module.ts**

Find the imports array and add:

```typescript
import { SubscriptionModule } from './module/subscription/subscription.module';
```

And in imports:

```typescript
SubscriptionModule,
```

- [ ] **Step 7: Commit**

```bash
git add src/module/subscription/
git add src/app.module.ts
git commit -m "feat: add subscription module with packages and quota tracking"
```

---

## Task 4: Integrate Credits + Subscription into Writing Submission

**Files:**
- Modify: `src/module/user-writing-submission/user-writing-submission.service.ts`
- Modify: `src/module/user-writing-submission/user-writing-submission.module.ts`

**Logic:** Check subscription quota FIRST → if no quota, check credits balance → deduct accordingly

- [ ] **Step 1: Update module to import both services**

Modify `user-writing-submission.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { UserWritingSubmissionService } from './user-writing-submission.service';
import { UserWritingSubmissionController } from './user-writing-submission.controller';
import { DatabaseModule } from 'src/database/database.module';
import { RabbitMQModule } from 'src/rabbitmq/rabbitmq.module';
import { CreditsModule } from 'src/module/credits/credits.module';
import { SubscriptionModule } from 'src/module/subscription/subscription.module';

@Module({
  imports: [DatabaseModule, RabbitMQModule, CreditsModule, SubscriptionModule],
  controllers: [UserWritingSubmissionController],
  providers: [UserWritingSubmissionService],
})
export class UserWritingSubmissionModule {}
```

- [ ] **Step 2: Update service to use both services**

Modify `user-writing-submission.service.ts` constructor:

```typescript
constructor(
  private readonly databaseService: DatabaseService,
  private readonly rabbitMQService: RabbitMQService,
  private readonly creditsService: CreditsService,
  private readonly subscriptionService: SubscriptionService,
) {}
```

- [ ] **Step 3: Update create method with priority flow**

In `createUserWritingSubmission` method, add payment logic before creating submission:

```typescript
// ===== Payment Priority =====
// 1. Check subscription quota first
const quota = await this.subscriptionService.checkQuota(idUser);

if (quota.hasQuota) {
  // Use subscription quota (1 credit for writing)
  await this.subscriptionService.useQuota(idUser, 1);
  // Track in submission for quota reset on failure
} else {
  // 2. Fall back to credits balance
  const CREDIT_COST = 1;
  try {
    await this.creditsService.deductCredit({
      idUser,
      type: 'WRITING',
      submissionId: 'pending',
      creditsCost: CREDIT_COST,
    });
  } catch (error) {
    if (error instanceof BadRequestException) {
      throw new BadRequestException('Insufficient credits and no active subscription');
    }
    throw error;
  }
  // Update transaction with real submission ID
  await this.creditsService.linkSubmissionToTransaction(idUser, 'WRITING', submission.idWritingSubmission);
}
```

**Note:** For subscription quota failure (grading fail), we need to refund quota. Add to SubscriptionService:

```typescript
async refundQuota(idUser: string, credits: number = 1) {
  // Quota tracking: creditsUsedThisPeriod decreases (not actual refund, just tracking)
  const sub = await this.db.userSubscription.findFirst({
    where: { idUser, status: 'ACTIVE' },
  });
  
  if (sub && sub.creditsUsedThisPeriod > 0) {
    await this.db.userSubscription.update({
      where: { idSubscription: sub.idSubscription },
      data: { 
        creditsUsedThisPeriod: Math.max(0, sub.creditsUsedThisPeriod - credits) 
      },
    });
  }
}
```

- [ ] **Step 4: Update grading failure to refund quota**

In grading worker (write.handler.ts), add quota refund:

```typescript
// If subscription quota was used, refund it
if (message.usedSubscriptionQuota) {
  try {
    const { subscriptionService } = await import('../../src/module/subscription/subscription.service');
    // Note: Worker may need direct DB approach similar to credit refund
  } catch (e) {
    console.error('Failed to refund subscription quota:', e);
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add src/module/user-writing-submission/
git commit -m "feat: integrate subscription quota and credits into writing submission"
```
        idSpeakingSubmission: type === 'SPEAKING' ? submissionId : undefined,
      },
    });
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/module/user-writing-submission/
git commit -m "feat: integrate credits deduction into writing submission"
```

---

## Task 5: Integrate Credits + Subscription into Speaking Submission

**Files:**
- Modify: `src/module/user-speaking-submission/user-speaking-submission.service.ts`
- Modify: `src/module/user-speaking-submission/user-speaking-submission.module.ts`

**Logic:** Same as Task 4 but SPEAKING_COST = 2 (Whisper + LLM)

- [ ] **Step 1: Update module to import both services**

Modify `user-speaking-submission.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { UserSpeakingSubmissionService } from './user-speaking-submission.service';
import { UserSpeakingSubmissionController } from './user-speaking-submission.controller';
import { DatabaseModule } from 'src/database/database.module';
import { RabbitMQModule } from 'src/rabbitmq/rabbitmq.module';
import { CreditsModule } from 'src/module/credits/credits.module';
import { SubscriptionModule } from 'src/module/subscription/subscription.module';

@Module({
  imports: [DatabaseModule, RabbitMQModule, CreditsModule, SubscriptionModule],
  controllers: [UserSpeakingSubmissionController],
  providers: [UserSpeakingSubmissionService],
})
export class UserSpeakingSubmissionModule {}
```

- [ ] **Step 2: Update service with same payment flow**

Same as Task 4, but:
- `SPEAKING_COST = 2` (2 credits for speaking - Whisper + LLM)
- Subscription quota check uses 2 credits

```typescript
// Check subscription quota first (2 credits for speaking)
const quota = await this.subscriptionService.checkQuota(idUser);

if (quota.hasQuota) {
  await this.subscriptionService.useQuota(idUser, 2);
} else {
  // Fall back to credits (2 credits for speaking)
  const SPEAKING_COST = 2;
  await this.creditsService.deductCredit({ ... });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/module/user-speaking-submission/
git commit -m "feat: integrate subscription quota and credits into speaking submission"
```

---

## Task 6: Grading Worker - Refund on Failure

**Files:**
- Modify: `ai-workers/grading-worker/write.handler.ts`
- Modify: `ai-workers/grading-worker/speak.handler.ts`

- [ ] **Step 1: Read write.handler.ts**

```bash
cat /home/khoa/Documents/ielts_training_app/ai-workers/grading-worker/write.handler.ts
```

- [ ] **Step 2: Add refund logic for BOTH credits AND subscription quota on FAILED status**

In the catch block where grading fails (after exhausting retries), add:

```typescript
// Refund credits or subscription quota for failed grading
try {
  const { neonService } = await import('../neon.service');
  const db = neonService.getClient();
  
  // Get submission details (includes usedSubscriptionQuota flag from message)
  const submission = await db.userWritingSubmission.findUnique({
    where: { idWritingSubmission: message.submissionId },
    select: { 
      idUser: true,
      idCreditTransaction: true,
    },
  });

  if (submission) {
    // REFUND OPTION 1: Subscription quota (if was used)
    if (message.usedSubscriptionQuota) {
      // Find active subscription and restore quota
      const sub = await db.userSubscription.findFirst({
        where: { idUser: submission.idUser, status: 'ACTIVE' },
      });
      
      if (sub && sub.creditsUsedThisPeriod > 0) {
        const refundAmount = message.submissionType === 'WRITING' ? 1 : 2;
        await db.userSubscription.update({
          where: { idSubscription: sub.idSubscription },
          data: { 
            creditsUsedThisPeriod: Math.max(0, sub.creditsUsedThisPeriod - refundAmount) 
          },
        });
        console.log(`Refunded ${refundAmount} subscription quota for user ${submission.idUser}`);
      }
    }
    
    // REFUND OPTION 2: Credits (if credit transaction was used)
    if (submission.idCreditTransaction) {
      const originalTx = await db.creditTransaction.findUnique({
        where: { idTransaction: submission.idCreditTransaction },
      });

      if (originalTx && originalTx.transactionType === 'USED_WRITING') {
        await db.creditTransaction.update({
          where: { idTransaction: originalTx.idTransaction },
          data: { status: 'CANCELLED' },
        });

        await db.creditTransaction.create({
          data: {
            idUser: submission.idUser,
            creditsAmount: originalTx.creditsAmount,
            transactionType: 'REFUND',
            idWritingSubmission: message.submissionId,
            description: 'Refund for failed writing grading',
            status: 'COMPLETED',
          },
        });

        const balance = await db.creditBalance.findUnique({
          where: { idUser: submission.idUser },
        });

        if (balance) {
          await db.creditBalance.update({
            where: { idUser: submission.idUser },
            data: {
              usedCredits: Math.max(0, balance.usedCredits - originalTx.creditsAmount),
            },
          });
          console.log(`Refunded ${originalTx.creditsAmount} credits for user ${submission.idUser}`);
        }
      }
    }
  }
} catch (refundError) {
  console.error('Failed to refund:', refundError);
}
// Don't rethrow - grading already failed, we don't want to retry the refund
```

- [ ] **Step 3: Apply same pattern to speak.handler.ts** (same logic but check for USED_SPEAKING transaction type)

- [ ] **Step 4: Commit**

```bash
git add ai-workers/grading-worker/write.handler.ts ai-workers/grading-worker/speak.handler.ts
git commit -m "feat: add credit and subscription quota refund on grading failure"
```

---

## Task 7: Seed Initial Credit Packages + Subscription Packages

**Files:**
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Add Credit Package seed data**

```typescript
// After existing seeds, add:
async function seedCreditPackages() {
  const packages = [
    {
      name: 'Starter Pack',
      description: '5 AI Grading Credits to get started',
      creditAmount: 5,
      price: 0,
      priceUnit: 'VND',
      isActive: true,
      sortOrder: 1,
    },
    {
      name: 'Basic Pack',
      description: '10 AI Grading Credits',
      creditAmount: 10,
      price: 50000,
      priceUnit: 'VND',
      isActive: true,
      sortOrder: 2,
    },
    {
      name: 'Standard Pack',
      description: '30 AI Grading Credits - Best Value',
      creditAmount: 30,
      price: 120000,
      priceUnit: 'VND',
      isActive: true,
      sortOrder: 3,
    },
    {
      name: 'Premium Pack',
      description: '100 AI Grading Credits',
      creditAmount: 100,
      price: 350000,
      priceUnit: 'VND',
      isActive: true,
      sortOrder: 4,
    },
  ];

  for (const pkg of packages) {
    await prisma.creditPackage.upsert({
      where: { name: pkg.name }, // name has @unique
      update: pkg,
      create: pkg,
    });
  }
  console.log('✓ Credit packages seeded');
}
```

- [ ] **Step 2: Add Subscription Package seed data**

```typescript
async function seedSubscriptionPackages() {
  const packages = [
    {
      name: 'Monthly Basic',
      description: '30 AI Grading credits per month',
      billingCycle: 'MONTHLY',
      price: 199000,
      priceUnit: 'VND',
      creditsQuota: 30,
      features: ['AI Writing Grading', 'AI Speaking Grading', 'Progress Tracking'],
      badge: null,
      isActive: true,
      isFeatured: false,
      sortOrder: 1,
    },
    {
      name: 'Monthly Pro',
      description: '60 AI Grading credits per month',
      billingCycle: 'MONTHLY',
      price: 349000,
      priceUnit: 'VND',
      creditsQuota: 60,
      features: ['AI Writing Grading', 'AI Speaking Grading', 'Progress Tracking', 'Priority Queue'],
      badge: 'Popular',
      isActive: true,
      isFeatured: true,
      sortOrder: 2,
    },
    {
      name: 'Monthly Premium',
      description: 'Unlimited AI Grading - Best for intensive learners',
      billingCycle: 'MONTHLY',
      price: 599000,
      priceUnit: 'VND',
      creditsQuota: 0, // 0 = unlimited
      features: ['AI Writing Grading', 'AI Speaking Grading', 'Progress Tracking', 'Priority Queue', 'Unlimited Access'],
      badge: 'Best Value',
      isActive: true,
      isFeatured: false,
      sortOrder: 3,
    },
    {
      name: 'Annual Basic',
      description: '360 AI Grading credits (30/month) - Save 20%',
      billingCycle: 'ANNUAL',
      price: 1900000,
      priceUnit: 'VND',
      creditsQuota: 360,
      features: ['AI Writing Grading', 'AI Speaking Grading', 'Progress Tracking'],
      badge: null,
      isActive: true,
      isFeatured: false,
      sortOrder: 4,
    },
    {
      name: 'Annual Pro',
      description: '720 AI Grading credits (60/month) - Save 20%',
      billingCycle: 'ANNUAL',
      price: 3350000,
      priceUnit: 'VND',
      creditsQuota: 720,
      features: ['AI Writing Grading', 'AI Speaking Grading', 'Progress Tracking', 'Priority Queue'],
      badge: 'Popular',
      isActive: true,
      isFeatured: false,
      sortOrder: 5,
    },
  ];

  for (const pkg of packages) {
    await prisma.subscriptionPackage.upsert({
      where: { name: pkg.name }, // name has @unique
      update: pkg,
      create: pkg,
    });
  }
  console.log('✓ Subscription packages seeded');
}
```

- [ ] **Step 3: Add free starter credits for new users**

In the user creation seed, add:

```typescript
// Give new users 3 free credits to try
await prisma.creditBalance.create({
  data: {
    idUser: user.idUser,
    totalCredits: 3,
    usedCredits: 0,
  },
});
```

- [ ] **Step 4: Run seed**

```bash
cd /home/khoa/Documents/ielts_training_app && npm run db:seed
```

- [ ] **Step 5: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat: seed credit packages, subscription packages, and starter credits"
```

---

## Task 8: VNPay Payment Gateway Integration

**Files:**
- Create: `src/module/payment/payment.module.ts`
- Create: `src/module/payment/payment.controller.ts`
- Create: `src/module/payment/payment.service.ts`
- Create: `src/module/payment/payment.utils.ts`
- Create: `src/module/payment/dto/create-payment.dto.ts`
- Create: `src/module/payment/dto/vnpay-return.dto.ts`

**VNPay Sandbox URLs:**
- Payment URL: `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html`
- Query/Refund API: `https://sandbox.vnpayment.vn/merchant_webapi/api/transaction`
- Hash: HMAC SHA512, sort params alphabetically

### Environment Variables

```env
VNPAY_TMN_CODE=your_tmn_code
VNPAY_HASH_SECRET=your_hash_secret
VNPAY_RETURN_URL=https://yourapp.com/payment/vnpay/return
VNPAY_IPN_URL=https://yourapp.com/payment/vnpay/ipn
VNPAY_SANDBOX=true
```

- [ ] **Step 1: Create payment.utils.ts (VNPay signature)**

```typescript
import * as crypto from 'crypto';

export class VnpayUtils {
  /**
   * Sort object keys alphabetically and build query string
   */
  static sortAndBuildQueryString(params: Record<string, string | number>): string {
    const sortedKeys = Object.keys(params).sort((a, b) => a.localeCompare(b));
    const queryParts: string[] = [];

    for (const key of sortedKeys) {
      if (key !== 'vnp_SecureHash' && params[key] !== undefined && params[key] !== null && params[key] !== '') {
        queryParts.push(`${key}=${params[key]}`);
      }
    }

    return queryParts.join('&');
  }

  /**
   * Generate HMAC SHA512 signature
   */
  static generateSignature(params: Record<string, string | number>, secretKey: string): string {
    const queryString = this.sortAndBuildQueryString(params);
    const hmac = crypto.createHmac('sha512', secretKey);
    hmac.update(queryString);
    return hmac.digest('hex').toUpperCase();
  }

  /**
   * Verify VNPay response signature
   */
  static verifySignature(params: Record<string, string | number>, secretKey: string): boolean {
    const receivedHash = params['vnp_SecureHash'];
    if (!receivedHash) return false;

    const { vnp_SecureHash, ...paramsWithoutHash } = params;
    const calculatedHash = this.generateSignature(paramsWithoutHash, secretKey);

    return calculatedHash === receivedHash;
  }
}
```

- [ ] **Step 2: Create payment.service.ts**

```typescript
import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaymentService {
  private readonly vnpTmnCode: string;
  private readonly vnpHashSecret: string;
  private readonly vnpReturnUrl: string;
  private readonly vnpIpnUrl: string;
  private readonly isSandbox: boolean;

  // VNPay endpoints
  private readonly VNP_URL = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
  private readonly VNP_API_URL = 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction';

  constructor(private readonly configService: ConfigService) {
    this.vnpTmnCode = this.configService.get('VNPAY_TMN_CODE');
    this.vnpHashSecret = this.configService.get('VNPAY_HASH_SECRET');
    this.vnpReturnUrl = this.configService.get('VNPAY_RETURN_URL');
    this.vnpIpnUrl = this.configService.get('VNPAY_IPN_URL');
    this.isSandbox = this.configService.get('VNPAY_SANDBOX', 'true') === 'true';
  }

  /**
   * Create VNPay payment URL for credit package purchase
   */
  async createPaymentUrl(params: {
    idUser: string;
    idPackage: string;
    packageType: 'CREDIT' | 'SUBSCRIPTION';
    amount: number; // Amount in VND (not *100)
    orderInfo: string;
    ipAddress: string;
  }): Promise<{ paymentUrl: string; txnRef: string }> {
    const { idUser, idPackage, packageType, amount, orderInfo, ipAddress } = params;

    const txnRef = `${packageType}_${idUser}_${idPackage}_${Date.now()}`;
    const now = new Date();
    const expireDate = new Date(now.getTime() + 15 * 60 * 1000); // 15 min expiry

    const vnpParams: Record<string, string | number> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.vnpTmnCode,
      vnp_Amount: amount * 100, // Convert to cents (no decimals)
      vnp_CurrCode: 'VND',
      vnp_Locale: 'vn',
      vnp_IpAddr: ipAddress,
      vnp_OrderInfo: orderInfo,
      vnp_OrderType: 'topup', // Category: topup, bill, etc.
      vnp_ReturnUrl: this.vnpReturnUrl,
      vnp_ExpireDate: this.formatDate(expireDate),
      vnp_TxnRef: txnRef,
      vnp_CreateDate: this.formatDate(now),
    };

    // Generate signature
    const { VnpayUtils } = await import('./payment.utils');
    vnpParams['vnp_SecureHash'] = VnpayUtils.generateSignature(vnpParams, this.vnpHashSecret);

    // Build payment URL
    const paymentUrl = `${this.VNP_URL}?${new URLSearchParams(vnpParams as any).toString()}`;

    return { paymentUrl, txnRef };
  }

  /**
   * Handle VNPay return (after customer completes payment)
   */
  async handleVnpayReturn(query: any): Promise<{
    success: boolean;
    message: string;
    txnRef?: string;
    amount?: number;
  }> {
    const { VnpayUtils } = await import('./payment.utils');

    // Verify signature
    if (!VnpayUtils.verifySignature(query, this.vnpHashSecret)) {
      return { success: false, message: 'Invalid signature' };
    }

    const responseCode = query['vnp_ResponseCode'];
    const txnRef = query['vnp_TxnRef'];
    const amount = parseInt(query['vnp_Amount']) / 100;

    if (responseCode === '00') {
      return {
        success: true,
        message: 'Payment successful',
        txnRef,
        amount,
      };
    }

    const errorMessages: Record<string, string> = {
      '07': 'Suspected fraud',
      '09': 'Internet banking not registered',
      '10': 'Invalid account info',
      '11': 'Payment timeout',
      '24': 'Customer cancelled',
      '51': 'Insufficient funds',
      '65': 'Daily limit exceeded',
      '75': 'Bank maintenance',
      '79': 'Wrong password',
      '99': 'Other error',
    };

    return {
      success: false,
      message: errorMessages[responseCode] || `Payment failed with code: ${responseCode}`,
      txnRef,
      amount,
    };
  }

  /**
   * Handle VNPay IPN (server-to-server notification)
   */
  async handleVnpayIpn(query: any): Promise<{ rspCode: string; message: string }> {
    const { VnpayUtils } = await import('./payment.utils');

    // Verify signature
    if (!VnpayUtils.verifySignature(query, this.vnpHashSecret)) {
      return { rspCode: '97', message: 'Invalid signature' };
    }

    const responseCode = query['vnp_ResponseCode'];
    const transactionStatus = query['vnp_TransactionStatus'];
    const txnRef = query['vnp_TxnRef'];
    const amount = parseInt(query['vnp_Amount']) / 100;

    if (responseCode === '00' && transactionStatus === '00') {
      // Payment successful - credits/subscription will be provisioned
      // based on txnRef parsing (idUser, idPackage, packageType)
      // This is handled asynchronously - return success to VNPay
      return { rspCode: '00', message: 'Confirm success' };
    }

    // Payment failed
    return { rspCode: '00', message: 'Order processed' }; // Return 00 to stop VNPay retry
  }

  /**
   * Query transaction status (for reconciliation)
   */
  async queryTransaction(txnRef: string): Promise<any> {
    // Implementation for querying VNPay transaction status
    // Uses the Query/Refund API endpoint
  }

  /**
   * Format date to yyyyMMddHHmmss (GMT+7)
   */
  private formatDate(date: Date): string {
    const yyyy = date.getFullYear();
    const MM = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const HH = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${yyyy}${MM}${dd}${HH}${mm}${ss}`;
  }
}
```

- [ ] **Step 3: Create DTOs**

```typescript
// dto/create-payment.dto.ts
import { IsString, IsUUID, IsNumber, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({ enum: ['CREDIT', 'SUBSCRIPTION'] })
  @IsString()
  @IsIn(['CREDIT', 'SUBSCRIPTION'])
  packageType: 'CREDIT' | 'SUBSCRIPTION';

  @ApiProperty()
  @IsUUID()
  idPackage: string;

  @ApiProperty({ description: 'Client IP address' })
  @IsString()
  ipAddress: string;
}

// dto/vnpay-return.dto.ts
import { IsString, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VnpayReturnDto {
  @ApiProperty()
  @IsString()
  vnp_TmnCode: string;

  @ApiProperty()
  @IsString()
  vnp_TxnRef: string;

  @ApiProperty()
  @IsString()
  vnp_Amount: string;

  @ApiProperty()
  @IsString()
  vnp_BankCode: string;

  @ApiProperty()
  @IsString()
  vnp_PayDate: string;

  @ApiProperty()
  @IsString()
  vnp_OrderInfo: string;

  @ApiProperty()
  @IsString()
  vnp_TransactionNo: string;

  @ApiProperty()
  @IsString()
  vnp_ResponseCode: string;

  @ApiProperty()
  @IsString()
  vnp_TransactionStatus: string;

  @ApiProperty()
  @IsString()
  vnp_SecureHash: string;
}
```

- [ ] **Step 4: Create payment.controller.ts**

```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/passport/jwt-auth.guard';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Response } from 'express';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * Create VNPay payment URL and redirect user
   * POST /payment/vnpay/create
   */
  @Post('vnpay/create')
  @UseGuards(JwtAuthGuard)
  async createPayment(
    @Request() req: any,
    @Body() dto: CreatePaymentDto,
    @Res() res: Response,
  ) {
    const { idUser } = req.user;
    const ipAddress = dto.ipAddress || req.ip;

    // Get package details to determine amount
    // TODO: Call CreditsService or SubscriptionService to get price

    const { paymentUrl, txnRef } = await this.paymentService.createPaymentUrl({
      idUser,
      idPackage: dto.idPackage,
      packageType: dto.packageType,
      amount: 50000, // TODO: Get from package price
      orderInfo: 'Purchase AI Grading Credits',
      ipAddress,
    });

    // Store txnRef in session or cache for verification on return
    // For now, redirect directly
    return res.redirect(paymentUrl);
  }

  /**
   * VNPay return URL (customer redirected here after payment)
   * GET /payment/vnpay/return
   */
  @Get('vnpay/return')
  async vnpayReturn(@Query() query: any, @Res() res: Response) {
    const result = await this.paymentService.handleVnpayReturn(query);

    if (result.success) {
      // Redirect to success page with query params
      return res.redirect(`/payment/success?txnRef=${result.txnRef}&amount=${result.amount}`);
    } else {
      // Redirect to failure page
      return res.redirect(`/payment/failed?message=${encodeURIComponent(result.message)}`);
    }
  }

  /**
   * VNPay IPN URL (server-to-server notification)
   * POST /payment/vnpay/ipn
   */
  @Post('vnpay/ipn')
  async vnpayIpn(@Body() body: any) {
    const result = await this.paymentService.handleVnpayIpn(body);
    return res.json(result);
  }
}
```

- [ ] **Step 5: Create payment.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';

@Module({
  imports: [ConfigModule],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
```

- [ ] **Step 6: Update .env.example with VNPay variables**

```env
# VNPay Configuration (Sandbox)
VNPAY_TMN_CODE=your_tmn_code_from_sandbox
VNPAY_HASH_SECRET=your_hash_secret_from_sandbox
VNPAY_RETURN_URL=http://localhost:3000/payment/vnpay/return
VNPAY_IPN_URL=http://localhost:3000/payment/vnpay/ipn
VNPAY_SANDBOX=true
```

- [ ] **Step 7: Update CreditsController to add payment URL generation**

In `src/module/credits/credits.controller.ts`, modify purchaseCredits to return payment URL:

```typescript
@Post('purchase')
@UseGuards(JwtAuthGuard)
async purchaseCredits(
  @Request() req: any,
  @Body() dto: PurchaseCreditsDto,
) {
  const { idUser } = req.user;

  // Get package price
  const pkg = await this.creditsService.getPackage(dto.idPackage);

  // Generate VNPay payment URL
  const paymentService = new PaymentService(configService);
  const { paymentUrl, txnRef } = await paymentService.createPaymentUrl({
    idUser,
    idPackage: dto.idPackage,
    packageType: 'CREDIT',
    amount: pkg.price,
    orderInfo: `Purchase ${pkg.name}`,
    ipAddress: req.ip,
  });

  // Store pending transaction with txnRef
  await this.creditsService.createPendingTransaction(idUser, dto.idPackage, txnRef);

  return { paymentUrl, txnRef };
}
```

- [ ] **Step 8: Commit**

```bash
git add src/module/payment/
git add .env.example
git commit -m "feat: add VNPay sandbox payment gateway integration"
```

---

## Verification Checklist

After implementation, verify:

### Credits System
- [ ] `POST /credits/balance` returns user's credit balance (create CreditBalance if not exists)
- [ ] `GET /credits/packages` returns list of active credit packages
- [ ] `POST /credits/purchase` deducts from balance correctly
- [ ] `POST /writing/submission` deducts 1 credit on success (if no subscription)
- [ ] `POST /speaking/submission` deducts 2 credits on success (if no subscription)
- [ ] Failed grading refunds credits (usedCredits decreases)

### Subscription System
- [ ] `GET /subscriptions/packages` returns list of active subscription packages
- [ ] `POST /subscriptions/subscribe` creates new subscription
- [ ] `GET /subscriptions/current` returns active subscription for user
- [ ] `PUT /subscriptions/cancel` cancels subscription (status → CANCELLED, autoRenew → false)

### Payment Priority Flow
- [ ] User WITH active subscription quota → uses subscription (quota decreases)
- [ ] User with exhausted subscription quota → falls back to credits
- [ ] User with NO subscription + no credits → receives 400 error
- [ ] Failed grading with subscription → quota is refunded (creditsUsedThisPeriod decreases)

### Admin Functions
- [ ] Admin can adjust credit balance via `POST /credits/admin/adjust`
- [ ] Admin can grant subscription via `POST /subscriptions/admin/grant`
- [ ] Admin can create credit package via `POST /credits/packages`
- [ ] Admin can create subscription package via `POST /subscriptions/packages`

### New Users
- [ ] New users start with 3 free credits
- [ ] New users have no active subscription initially

### VNPay Payment (Sandbox)
- [ ] `POST /payment/vnpay/create` redirects to VNPay sandbox URL
- [ ] VNPay sandbox payment completes and redirects to `/payment/vnpay/return`
- [ ] `GET /payment/vnpay/return` validates signature and shows success/failure
- [ ] `POST /payment/vnpay/ipn` receives server-to-server notification
- [ ] After successful payment, credits/subscription is provisioned

---

## Notes

### Credit cost configuration:
- Writing: 1 credit (1 Groq API call)
- Speaking: 2 credits (Whisper + LLM = 2 API calls)

These constants should be moved to a config file/env var in production.

### Entitlement checks happen at submission time
Credits are "frozen" immediately when user submits, not when grading completes. This ensures you don't lose money on submissions that sit in queue.

### Refund on failure
If grading fails after all retries, credits OR subscription quota are returned to the user. User can retry submission (which costs credits/quota again).

### Payment Priority
```
User submits writing/speaking →
  1. Check active subscription with remaining quota →
     YES: deduct from subscription quota
  2. Check credits balance →
     YES: deduct from credits
  3. Neither available →
     FAIL: 400 "Insufficient credits and no active subscription"
```

### Subscription vs Credits difference
| | Credits | Subscription |
|---|---|---|
| Purchase | One-time | Monthly/Annual recurring |
| Expiry | Credits expire (6-12 months) | Subscription auto-renews |
| Quota | Accumulate | Reset each billing period |
| Refund | Full refund on failure | Quota restored on failure |

### VNPay Sandbox Integration

**Sandbox URLs:**
- Payment page: `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html`
- Query/Refund API: `https://sandbox.vnpayment.vn/merchant_webapi/api/transaction`
- Registration: `http://sandbox.vnpayment.vn/devreg/`

**Important Parameters:**
| Parameter | Value |
|---|---|
| `vnp_Version` | 2.1.0 |
| `vnp_Command` | pay |
| `vnp_CurrCode` | VND |
| `vnp_Locale` | vn |
| `vnp_OrderType` | topup |
| `vnp_Amount` | amount × 100 (no decimals) |

**Response Codes (vnp_ResponseCode):**
| Code | Meaning |
|---|---|
| 00 | Success |
| 07 | Suspected fraud |
| 09 | Internet banking not registered |
| 10 | Invalid account info |
| 11 | Payment timeout |
| 24 | Customer cancelled |
| 51 | Insufficient funds |
| 65 | Daily limit exceeded |
| 75 | Bank maintenance |
| 99 | Other error |

**Signature Algorithm:**
1. Sort parameters alphabetically (excluding vnp_SecureHash)
2. Build query string: `key1=value1&key2=value2...`
3. Generate HMAC SHA512 with secret key
4. Convert to uppercase hex

**Test Credentials:**
Register at `http://sandbox.vnpayment.vn/devreg/` to get:
- `vnp_TmnCode`: Terminal ID
- `vnp_HashSecret`: Secret key

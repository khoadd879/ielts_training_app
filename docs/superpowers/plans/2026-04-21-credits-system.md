# Credits System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng hệ thống Credits/Wallet để kiểm soát việc sử dụng AI grading, làm nền tảng cho monetization.

**Architecture:**
- 3 Prisma models mới: `CreditPackage`, `CreditBalance`, `CreditTransaction`
- 1 service mới: `CreditsService` xử lý check balance, deduct, refund
- 1 module mới: `credits.module.ts`
- Middleware interceptor kiểm tra credits trước khi submit writing/speaking
- Integration vào submission flow (trừ credit khi submit, refund nếu grading fail)

**Tech Stack:** NestJS, Prisma, PostgreSQL

---

## File Structure

```
prisma/schema.prisma                              # Add 3 models + enum
src/database/database.module.ts                  # Export CreditsService
src/database/database.service.ts                 # Add Prisma references for new models
src/module/credits/                              # NEW MODULE
  credits.module.ts
  credits.controller.ts
  credits.service.ts
  dto/
    create-credit-package.dto.ts
    purchase-credit.dto.ts
src/module/user-writing-submission/                # MODIFY - integrate credits check
  user-writing-submission.service.ts
src/module/user-speaking-submission/              # MODIFY - integrate credits check
  user-speaking-submission.service.ts
ai-workers/grading-worker/write.handler.ts       # MODIFY - refund on FAIL
ai-workers/grading-worker/speak.handler.ts      # MODIFY - refund on FAIL
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
  name         String
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
```

- [ ] **Step 2: Add relations to existing User model**

Find the User model (line 14) and add after forumCommentLikes relation:

```prisma
  // Credits
  creditBalance    CreditBalance?
  creditTransactions CreditTransaction[]
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

Run: `cd /home/khoa/Documents/ielts_training_app && npx prisma migrate dev --name add_credit_models`
Expected: Migration creates 4 new tables

- [ ] **Step 6: Commit**

```bash
cd /home/khoa/Documents/ielts_training_app
git add prisma/migrations/ prisma/schema.prisma
git commit -m "feat: add credit models (CreditPackage, CreditBalance, CreditTransaction)"
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
```

- [ ] **Step 3: Add in constructor**

Find where other models are assigned and add:

```typescript
this.creditPackage = prisma.creditPackage;
this.creditBalance = prisma.creditBalance;
this.creditTransaction = prisma.creditTransaction;
```

- [ ] **Step 4: Commit**

```bash
git add src/database/database.service.ts
git commit -m "feat: add credit model references to database service"
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

## Task 4: Integrate Credits into Writing Submission

**Files:**
- Modify: `src/module/user-writing-submission/user-writing-submission.service.ts`
- Modify: `src/module/user-writing-submission/user-writing-submission.module.ts`

- [ ] **Step 1: Read user-writing-submission.module.ts**

```bash
cat /home/khoa/Documents/ielts_training_app/src/module/user-writing-submission/user-writing-submission.module.ts
```

- [ ] **Step 2: Update module to import CreditsService**

Modify `user-writing-submission.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { UserWritingSubmissionService } from './user-writing-submission.service';
import { UserWritingSubmissionController } from './user-writing-submission.controller';
import { DatabaseModule } from 'src/database/database.module';
import { RabbitMQModule } from 'src/rabbitmq/rabbitmq.module';
import { CreditsModule } from 'src/module/credits/credits.module';

@Module({
  imports: [DatabaseModule, RabbitMQModule, CreditsModule],
  controllers: [UserWritingSubmissionController],
  providers: [UserWritingSubmissionService],
})
export class UserWritingSubmissionModule {}
```

- [ ] **Step 3: Update service to use CreditsService**

Modify `user-writing-submission.service.ts` constructor and create method:

Add to constructor:

```typescript
constructor(
  private readonly databaseService: DatabaseService,
  private readonly rabbitMQService: RabbitMQService,
  private readonly creditsService: CreditsService,
) {}
```

In `createUserWritingSubmission` method, after validation and before creating submission, add:

```typescript
// Check and deduct credits
const CREDIT_COST = 1; // 1 credit per writing submission
try {
  await this.creditsService.deductCredit({
    idUser,
    type: 'WRITING',
    submissionId: 'pending', // Will update after creation
    creditsCost: CREDIT_COST,
  });
} catch (error) {
  if (error instanceof BadRequestException) {
    throw error; // Insufficient credits
  }
  throw error;
}
```

Then after submission is created, update the transaction with the real submissionId:

```typescript
// Update credit transaction with real submission ID
await this.creditsService.linkSubmissionToTransaction(idUser, 'WRITING', submission.idWritingSubmission);
```

Note: You'll need to add `linkSubmissionToTransaction` method to CreditsService:

```typescript
async linkSubmissionToTransaction(
  idUser: string,
  type: 'WRITING' | 'SPEAKING',
  submissionId: string,
) {
  // Find pending transaction for this user and update it
  const pendingTx = await this.db.creditTransaction.findFirst({
    where: {
      idUser,
      transactionType: type === 'WRITING' ? 'USED_WRITING' : 'USED_SPEAKING',
      idWritingSubmission: type === 'WRITING' ? undefined : undefined,
      status: 'COMPLETED',
    },
    orderBy: { createdAt: 'desc' },
  });

  if (pendingTx) {
    await this.db.creditTransaction.update({
      where: { idTransaction: pendingTx.idTransaction },
      data: {
        idWritingSubmission: type === 'WRITING' ? submissionId : undefined,
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

## Task 5: Integrate Credits into Speaking Submission

**Files:**
- Modify: `src/module/user-speaking-submission/user-speaking-submission.service.ts`
- Modify: `src/module/user-speaking-submission/user-speaking-submission.module.ts`

- [ ] **Step 1: Read user-speaking-submission.service.ts**

```bash
cat /home/khoa/Documents/ielts_training_app/src/module/user-speaking-submission/user-speaking-submission.service.ts
```

- [ ] **Step 2: Update module**

Similar to Task 4, add CreditsModule to the imports.

- [ ] **Step 3: Update service**

Add credits check before creating submission. SPEAKING_CREDIT_COST = 2 (speaking needs Whisper + LLM = higher cost).

- [ ] **Step 4: Commit**

```bash
git add src/module/user-speaking-submission/
git commit -m "feat: integrate credits deduction into speaking submission"
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

- [ ] **Step 2: Add refund logic on FAILED status**

In the catch block where grading fails (after exhausting retries), add:

```typescript
// Refund credits for failed grading
try {
  const { neonService } = await import('../neon.service');
  const db = neonService.getClient();
  
  // Get user ID from submission
  const submission = await db.userWritingSubmission.findUnique({
    where: { idWritingSubmission: message.submissionId },
    select: { idUser: true },
  });

  if (submission) {
    // Call refund API - you need to expose this endpoint or call DB directly
    // For now, we'll use direct DB update since the worker has DB access
    const balance = await db.creditBalance.findUnique({
      where: { idUser: submission.idUser },
    });

    if (balance) {
      const originalTx = await db.creditTransaction.findFirst({
        where: {
          idUser: submission.idUser,
          idWritingSubmission: message.submissionId,
          transactionType: 'USED_WRITING',
        },
      });

      if (originalTx) {
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

        await db.creditBalance.update({
          where: { idUser: submission.idUser },
          data: {
            usedCredits: Math.max(0, balance.usedCredits - originalTx.creditsAmount),
          },
        });
      }
    }
  }
} catch (refundError) {
  console.error('Failed to refund credits:', refundError);
}
// Don't rethrow - grading already failed, we don't want to retry the refund
```

- [ ] **Step 3: Apply same pattern to speak.handler.ts**

- [ ] **Step 4: Commit**

```bash
git add ai-workers/grading-worker/write.handler.ts ai-workers/grading-worker/speak.handler.ts
git commit -m "feat: add credit refund on grading failure"
```

---

## Task 7: Seed Initial Credit Packages

**Files:**
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Add seed data**

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
      where: { idPackage: pkg.name }, // Use name as unique key for upsert
      update: pkg,
      create: pkg,
    });
  }
  console.log('✓ Credit packages seeded');
}
```

- [ ] **Step 2: Add free starter credits for new users**

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

- [ ] **Step 3: Run seed**

```bash
cd /home/khoa/Documents/ielts_training_app && npm run db:seed
```

- [ ] **Step 4: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat: seed credit packages and give new users 3 free credits"
```

---

## Verification Checklist

After implementation, verify:

- [ ] `POST /credits/balance` returns user's credit balance (create CreditBalance if not exists)
- [ ] `GET /credits/packages` returns list of active packages
- [ ] `POST /credits/purchase` deducts from balance correctly
- [ ] `POST /writing/submission` fails with 400 if insufficient credits
- [ ] `POST /writing/submission` deducts 1 credit on success
- [ ] `POST /speaking/submission` deducts 2 credits on success
- [ ] Failed grading refunds credits (usedCredits decreases)
- [ ] Admin can adjust balance via `POST /credits/admin/adjust`
- [ ] New users start with 3 free credits

---

## Notes

**Credit cost configuration:**
- Writing: 1 credit (1 Groq API call)
- Speaking: 2 credits (Whisper + LLM = 2 API calls)

These constants should be moved to a config file/env var in production.

**Entitlement checks happen at submission time** - credits are "frozen" immediately when user submits, not when grading completes. This ensures you don't lose money on submissions that sit in queue.

**Refund on failure** - if grading fails after all retries, credits are returned to the user. User can retry submission (which costs credits again).

-- CreateEnum
CREATE TYPE "CreditTransType" AS ENUM ('PURCHASE', 'USED_WRITING', 'USED_SPEAKING', 'REFUND', 'EXPIRY', 'BONUS', 'ADMIN_ADJUST');

-- CreateEnum
CREATE TYPE "CreditTransStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('MOMO', 'VNPAY', 'STRIPE', 'BANK_TRANSFER', 'ADMIN_CREDIT');

-- AlterTable
ALTER TABLE "UserSpeakingSubmission" ADD COLUMN     "idCreditTransaction" TEXT;

-- AlterTable
ALTER TABLE "UserWritingSubmission" ADD COLUMN     "idCreditTransaction" TEXT;

-- CreateTable
CREATE TABLE "CreditPackage" (
    "idPackage" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "creditAmount" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "priceUnit" TEXT NOT NULL DEFAULT 'VND',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditPackage_pkey" PRIMARY KEY ("idPackage")
);

-- CreateTable
CREATE TABLE "CreditBalance" (
    "idUser" TEXT NOT NULL,
    "totalCredits" INTEGER NOT NULL DEFAULT 0,
    "usedCredits" INTEGER NOT NULL DEFAULT 0,
    "frozenCredits" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CreditBalance_pkey" PRIMARY KEY ("idUser")
);

-- CreateTable
CREATE TABLE "CreditTransaction" (
    "idTransaction" TEXT NOT NULL,
    "idUser" TEXT NOT NULL,
    "idPackage" TEXT,
    "creditsAmount" INTEGER NOT NULL,
    "transactionType" "CreditTransType" NOT NULL,
    "description" TEXT,
    "idWritingSubmission" TEXT,
    "idSpeakingSubmission" TEXT,
    "status" "CreditTransStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creditBalanceIdUser" TEXT,

    CONSTRAINT "CreditTransaction_pkey" PRIMARY KEY ("idTransaction")
);

-- CreateTable
CREATE TABLE "SubscriptionPackage" (
    "idPackage" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "price" DOUBLE PRECISION NOT NULL,
    "priceUnit" TEXT NOT NULL DEFAULT 'VND',
    "creditsQuota" INTEGER NOT NULL DEFAULT 0,
    "features" TEXT[],
    "badge" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPackage_pkey" PRIMARY KEY ("idPackage")
);

-- CreateTable
CREATE TABLE "UserSubscription" (
    "idSubscription" TEXT NOT NULL,
    "idUser" TEXT NOT NULL,
    "idPackage" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "nextBillingAt" TIMESTAMP(3),
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "creditsUsedThisPeriod" INTEGER NOT NULL DEFAULT 0,
    "creditsQuotaThisPeriod" INTEGER NOT NULL DEFAULT 0,
    "paymentRef" TEXT,
    "paymentMethod" "PaymentMethod",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSubscription_pkey" PRIMARY KEY ("idSubscription")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreditPackage_name_key" ON "CreditPackage"("name");

-- CreateIndex
CREATE INDEX "CreditPackage_isActive_sortOrder_idx" ON "CreditPackage"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "CreditBalance_idUser_idx" ON "CreditBalance"("idUser");

-- CreateIndex
CREATE INDEX "CreditTransaction_idUser_createdAt_idx" ON "CreditTransaction"("idUser", "createdAt");

-- CreateIndex
CREATE INDEX "CreditTransaction_transactionType_createdAt_idx" ON "CreditTransaction"("transactionType", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPackage_name_key" ON "SubscriptionPackage"("name");

-- CreateIndex
CREATE INDEX "SubscriptionPackage_isActive_sortOrder_idx" ON "SubscriptionPackage"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "SubscriptionPackage_billingCycle_idx" ON "SubscriptionPackage"("billingCycle");

-- CreateIndex
CREATE INDEX "UserSubscription_idUser_status_idx" ON "UserSubscription"("idUser", "status");

-- CreateIndex
CREATE INDEX "UserSubscription_expiresAt_idx" ON "UserSubscription"("expiresAt");

-- AddForeignKey
ALTER TABLE "CreditBalance" ADD CONSTRAINT "CreditBalance_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_idPackage_fkey" FOREIGN KEY ("idPackage") REFERENCES "CreditPackage"("idPackage") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_creditBalanceIdUser_fkey" FOREIGN KEY ("creditBalanceIdUser") REFERENCES "CreditBalance"("idUser") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSubscription" ADD CONSTRAINT "UserSubscription_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSubscription" ADD CONSTRAINT "UserSubscription_idPackage_fkey" FOREIGN KEY ("idPackage") REFERENCES "SubscriptionPackage"("idPackage") ON DELETE RESTRICT ON UPDATE CASCADE;

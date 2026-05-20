-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'EXPIRED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentPackageType" AS ENUM ('CREDIT', 'SUBSCRIPTION');

-- CreateTable
CREATE TABLE "PaymentTransaction" (
    "idTransaction" TEXT NOT NULL,
    "idUser" TEXT NOT NULL,
    "packageType" "PaymentPackageType" NOT NULL,
    "idCreditPackage" TEXT,
    "idSubscriptionPackage" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "priceUnit" TEXT NOT NULL DEFAULT 'VND',
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'VNPAY',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "vnpTxnRef" TEXT NOT NULL,
    "vnpTransactionNo" TEXT,
    "vnpResponseCode" TEXT,
    "vnpBankCode" TEXT,
    "vnpPayDate" TEXT,
    "rawCallback" JSONB,
    "idCreditTransaction" TEXT,
    "idSubscription" TEXT,
    "ipAddress" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("idTransaction")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTransaction_vnpTxnRef_key" ON "PaymentTransaction"("vnpTxnRef");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTransaction_idCreditTransaction_key" ON "PaymentTransaction"("idCreditTransaction");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTransaction_idSubscription_key" ON "PaymentTransaction"("idSubscription");

-- CreateIndex
CREATE INDEX "PaymentTransaction_idUser_status_idx" ON "PaymentTransaction"("idUser", "status");

-- CreateIndex
CREATE INDEX "PaymentTransaction_status_createdAt_idx" ON "PaymentTransaction"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentTransaction_vnpTxnRef_idx" ON "PaymentTransaction"("vnpTxnRef");

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_idCreditPackage_fkey" FOREIGN KEY ("idCreditPackage") REFERENCES "CreditPackage"("idPackage") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_idSubscriptionPackage_fkey" FOREIGN KEY ("idSubscriptionPackage") REFERENCES "SubscriptionPackage"("idPackage") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_idCreditTransaction_fkey" FOREIGN KEY ("idCreditTransaction") REFERENCES "CreditTransaction"("idTransaction") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_idSubscription_fkey" FOREIGN KEY ("idSubscription") REFERENCES "UserSubscription"("idSubscription") ON DELETE SET NULL ON UPDATE CASCADE;

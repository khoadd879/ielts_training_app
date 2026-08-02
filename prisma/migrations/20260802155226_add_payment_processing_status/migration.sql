-- Add PROCESSING to PaymentStatus enum (intermediate state for IPN race-safety)
ALTER TYPE "PaymentStatus" ADD VALUE 'PROCESSING';

-- Track when an IPN claimed the transaction for processing
ALTER TABLE "PaymentTransaction" ADD COLUMN "processedAt" TIMESTAMP(3);

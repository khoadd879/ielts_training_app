-- Track when an IPN claimed the transaction for processing.
-- Atomic claim uses WHERE processedAt IS NULL; status stays PENDING until SUCCESS/FAILED.
ALTER TABLE "PaymentTransaction" ADD COLUMN "processedAt" TIMESTAMP(3);

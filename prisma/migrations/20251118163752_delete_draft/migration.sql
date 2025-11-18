/*
  Warnings:

  - The values [DRAFT] on the enum `WritingStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "WritingStatus_new" AS ENUM ('SUBMITTED', 'GRADED');
ALTER TABLE "public"."UserWritingSubmission" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "UserWritingSubmission" ALTER COLUMN "status" TYPE "WritingStatus_new" USING ("status"::text::"WritingStatus_new");
ALTER TYPE "WritingStatus" RENAME TO "WritingStatus_old";
ALTER TYPE "WritingStatus_new" RENAME TO "WritingStatus";
DROP TYPE "public"."WritingStatus_old";
ALTER TABLE "UserWritingSubmission" ALTER COLUMN "status" SET DEFAULT 'SUBMITTED';
COMMIT;

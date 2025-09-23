-- CreateEnum
CREATE TYPE "public"."TestStatus" AS ENUM ('IN_PROGRESS', 'FINISHED', 'EXPIRED', 'CANCELLED');

-- AlterTable
ALTER TABLE "public"."UserTestResult" ADD COLUMN     "finishedAt" TIMESTAMP(3),
ADD COLUMN     "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" "public"."TestStatus" NOT NULL DEFAULT 'IN_PROGRESS';

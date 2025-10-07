/*
  Warnings:

  - The `feedback` column on the `UserWritingSubmission` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "public"."UserWritingSubmission" DROP COLUMN "feedback",
ADD COLUMN     "feedback" JSONB;

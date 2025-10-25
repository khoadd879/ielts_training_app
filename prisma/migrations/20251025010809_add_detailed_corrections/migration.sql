-- DropIndex
DROP INDEX "public"."Feedback_idWritingSubmission_key";

-- AlterTable
ALTER TABLE "Feedback" ADD COLUMN     "detailedCorrections" JSONB;

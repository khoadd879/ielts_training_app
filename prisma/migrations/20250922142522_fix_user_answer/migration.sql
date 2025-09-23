-- AlterTable
ALTER TABLE "public"."UserAnswer" ADD COLUMN     "timeRemaining" INTEGER,
ADD COLUMN     "timeSpent" INTEGER,
ALTER COLUMN "submitted_at" DROP NOT NULL;

-- CreateEnum
CREATE TYPE "ForumModerationStatus" AS ENUM (
    'PENDING',
    'AUTO_APPROVED',
    'NEEDS_REVIEW',
    'AUTO_REJECTED',
    'APPROVED',
    'REJECTED',
    'CHANGES_REQUESTED'
);

-- AlterTable
ALTER TABLE "ForumPost"
ADD COLUMN "moderationStatus" "ForumModerationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "moderationScore" INTEGER,
ADD COLUMN "moderationMeta" JSONB,
ADD COLUMN "reviewedBy" TEXT,
ADD COLUMN "reviewedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ForumPost_moderationStatus_created_at_idx"
ON "ForumPost"("moderationStatus", "created_at");

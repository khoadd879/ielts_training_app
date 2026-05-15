-- Migration: Add SM-2 vocabulary fields
-- Applied to database: 2026-05-11 03:13:30
-- Status: Already applied via db push (not recorded in migrations folder)

-- Add SM-2 Spaced Repetition fields
ALTER TABLE "Vocabulary" ADD COLUMN "timesReviewed" INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE "Vocabulary" ADD COLUMN "easinessFactor" DOUBLE PRECISION DEFAULT 2.5 NOT NULL;
ALTER TABLE "Vocabulary" ADD COLUMN "interval" INTEGER DEFAULT 1 NOT NULL;
ALTER TABLE "Vocabulary" ADD COLUMN "nextReviewAt" TIMESTAMP(3);
ALTER TABLE "Vocabulary" ADD COLUMN "status" TEXT DEFAULT 'new' NOT NULL;

-- Add Vocabulary Tier System
ALTER TABLE "Vocabulary" ADD COLUMN "tier" INTEGER DEFAULT 1 NOT NULL;
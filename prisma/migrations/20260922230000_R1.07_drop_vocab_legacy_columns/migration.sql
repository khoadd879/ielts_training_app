-- R1.07: Drop legacy columns from Vocabulary
-- Data already migrated to VocabSeed (tier, frequencyRank) và VocabMastery (SR fields)
-- correctStreak, xp = dead fields

-- Drop indexes that reference removed columns
DROP INDEX IF EXISTS "Vocabulary_idUser_status_nextReviewAt_idx";
DROP INDEX IF EXISTS "Vocabulary_idUser_tier_idx";

-- Drop legacy columns
ALTER TABLE "Vocabulary" DROP COLUMN "correctStreak";
ALTER TABLE "Vocabulary" DROP COLUMN "xp";
ALTER TABLE "Vocabulary" DROP COLUMN "tier";
ALTER TABLE "Vocabulary" DROP COLUMN "frequencyRank";
ALTER TABLE "Vocabulary" DROP COLUMN "timesReviewed";
ALTER TABLE "Vocabulary" DROP COLUMN "easinessFactor";
ALTER TABLE "Vocabulary" DROP COLUMN "interval";
ALTER TABLE "Vocabulary" DROP COLUMN "nextReviewAt";
ALTER TABLE "Vocabulary" DROP COLUMN "status";

-- AlterTable
ALTER TABLE "public"."TuVung" ADD COLUMN     "correctStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastReviewed" TIMESTAMP(3),
ADD COLUMN     "xp" INTEGER NOT NULL DEFAULT 0;

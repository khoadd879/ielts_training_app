/*
  Warnings:

  - You are about to alter the column `score` on the `UserTestResult` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.

*/
-- AlterTable
ALTER TABLE "public"."UserTestResult" ALTER COLUMN "score" DROP NOT NULL,
ALTER COLUMN "score" SET DEFAULT 0,
ALTER COLUMN "score" SET DATA TYPE INTEGER,
ALTER COLUMN "total_correct" DROP NOT NULL,
ALTER COLUMN "total_correct" SET DEFAULT 0,
ALTER COLUMN "total_questions" DROP NOT NULL,
ALTER COLUMN "total_questions" SET DEFAULT 0,
ALTER COLUMN "raw_score" DROP NOT NULL,
ALTER COLUMN "raw_score" SET DEFAULT 0;

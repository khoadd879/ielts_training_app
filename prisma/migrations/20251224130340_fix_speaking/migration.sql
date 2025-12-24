/*
  Warnings:

  - You are about to drop the column `fluencyAndCoherence` on the `SpeakingFeedback` table. All the data in the column will be lost.
  - You are about to drop the column `grammaticalRangeAndAccuracy` on the `SpeakingFeedback` table. All the data in the column will be lost.
  - You are about to drop the column `lexicalResource` on the `SpeakingFeedback` table. All the data in the column will be lost.
  - You are about to drop the column `pronunciation` on the `SpeakingFeedback` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SpeakingFeedback" DROP COLUMN "fluencyAndCoherence",
DROP COLUMN "grammaticalRangeAndAccuracy",
DROP COLUMN "lexicalResource",
DROP COLUMN "pronunciation",
ADD COLUMN     "commentFluency" TEXT,
ADD COLUMN     "commentGrammar" TEXT,
ADD COLUMN     "commentLexical" TEXT,
ADD COLUMN     "commentPronunciation" TEXT,
ADD COLUMN     "overallScore" DOUBLE PRECISION,
ADD COLUMN     "scoreFluency" DOUBLE PRECISION,
ADD COLUMN     "scoreGrammar" DOUBLE PRECISION,
ADD COLUMN     "scoreLexical" DOUBLE PRECISION,
ADD COLUMN     "scorePronunciation" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "SpeakingQuestion" ADD COLUMN     "audioQuestionUrl" TEXT;

-- AlterTable
ALTER TABLE "UserSpeakingSubmission" ADD COLUMN     "part" "SpeakingPartType";

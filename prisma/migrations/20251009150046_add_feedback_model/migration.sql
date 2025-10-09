/*
  Warnings:

  - You are about to drop the column `feedback` on the `UserWritingSubmission` table. All the data in the column will be lost.
  - You are about to drop the column `score` on the `UserWritingSubmission` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "UserWritingSubmission" DROP COLUMN "feedback",
DROP COLUMN "score";

-- CreateTable
CREATE TABLE "Feedback" (
    "idFeedback" TEXT NOT NULL,
    "idWritingSubmission" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "taskResponse" TEXT NOT NULL,
    "coherenceAndCohesion" TEXT NOT NULL,
    "lexicalResource" TEXT NOT NULL,
    "grammaticalRangeAndAccuracy" TEXT NOT NULL,
    "generalFeedback" TEXT NOT NULL,
    "gradedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("idFeedback")
);

-- CreateIndex
CREATE UNIQUE INDEX "Feedback_idWritingSubmission_key" ON "Feedback"("idWritingSubmission");

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_idWritingSubmission_fkey" FOREIGN KEY ("idWritingSubmission") REFERENCES "UserWritingSubmission"("idWritingSubmission") ON DELETE CASCADE ON UPDATE CASCADE;

/*
  Warnings:

  - The primary key for the `user_daily_task_completion` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `user_study_preference` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Made the column `completed` on table `user_daily_task_completion` required. This step will fail if there are existing NULL values in that column.
  - Made the column `dailyMinutesAvailable` on table `user_study_preference` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updatedAt` on table `user_study_preference` required. This step will fail if there are existing NULL values in that column.
  - Made the column `currentStage` on table `user_study_preference` required. This step will fail if there are existing NULL values in that column.
  - Made the column `weeksInCurrentStage` on table `user_study_preference` required. This step will fail if there are existing NULL values in that column.
  - Made the column `stageStartDate` on table `user_study_preference` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Vocabulary" ADD COLUMN     "frequencyRank" INTEGER;

-- AlterTable
ALTER TABLE "user_daily_task_completion" DROP CONSTRAINT "user_daily_task_completion_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "idStudyPlan" SET DATA TYPE TEXT,
ALTER COLUMN "taskType" SET DATA TYPE TEXT,
ALTER COLUMN "completed" SET NOT NULL,
ADD CONSTRAINT "user_daily_task_completion_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "user_study_preference" DROP CONSTRAINT "user_study_preference_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "dailyMinutesAvailable" SET NOT NULL,
ALTER COLUMN "updatedAt" SET NOT NULL,
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "currentStage" SET NOT NULL,
ALTER COLUMN "weeksInCurrentStage" SET NOT NULL,
ALTER COLUMN "stageStartDate" SET NOT NULL,
ADD CONSTRAINT "user_study_preference_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "GrammarExercise" (
    "id" TEXT NOT NULL,
    "idGrammar" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrammarExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserGrammarProficiency" (
    "idUser" TEXT NOT NULL,
    "idGrammar" TEXT NOT NULL,
    "proficiency" TEXT NOT NULL,
    "totalAttempts" INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "wrongCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserGrammarProficiency_pkey" PRIMARY KEY ("idUser","idGrammar")
);

-- CreateTable
CREATE TABLE "UserGrammarViolation" (
    "id" TEXT NOT NULL,
    "idUser" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "idGrammar" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "userSentence" TEXT NOT NULL,
    "correctedSentence" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserGrammarViolation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserGrammarExerciseResult" (
    "id" TEXT NOT NULL,
    "idUser" TEXT NOT NULL,
    "idExercise" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserGrammarExerciseResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionTypePerformance" (
    "id" TEXT NOT NULL,
    "idUser" TEXT NOT NULL,
    "skillType" TEXT NOT NULL,
    "questionType" TEXT NOT NULL,
    "totalAttempts" INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "errorRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),

    CONSTRAINT "QuestionTypePerformance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserGrammarViolation_idUser_idGrammar_idx" ON "UserGrammarViolation"("idUser", "idGrammar");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionTypePerformance_idUser_skillType_questionType_key" ON "QuestionTypePerformance"("idUser", "skillType", "questionType");

-- AddForeignKey
ALTER TABLE "GrammarExercise" ADD CONSTRAINT "GrammarExercise_idGrammar_fkey" FOREIGN KEY ("idGrammar") REFERENCES "Grammar"("idGrammar") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGrammarProficiency" ADD CONSTRAINT "UserGrammarProficiency_idGrammar_fkey" FOREIGN KEY ("idGrammar") REFERENCES "Grammar"("idGrammar") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGrammarExerciseResult" ADD CONSTRAINT "UserGrammarExerciseResult_idExercise_fkey" FOREIGN KEY ("idExercise") REFERENCES "GrammarExercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_study_preference" ADD CONSTRAINT "user_study_preference_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE;

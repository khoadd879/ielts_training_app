-- CreateEnum
CREATE TYPE "SpeakingPartType" AS ENUM ('PART1', 'PART2', 'PART3');

-- CreateEnum
CREATE TYPE "SpeakingStatus" AS ENUM ('SUBMITTED', 'GRADED');

-- AlterEnum
ALTER TYPE "loaiDe" ADD VALUE 'SPEAKING';

-- CreateTable
CREATE TABLE "SpeakingTask" (
    "idSpeakingTask" TEXT NOT NULL,
    "idDe" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "audioPromptUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpeakingTask_pkey" PRIMARY KEY ("idSpeakingTask")
);

-- CreateTable
CREATE TABLE "SpeakingQuestion" (
    "idSpeakingQuestion" TEXT NOT NULL,
    "idSpeakingTask" TEXT NOT NULL,
    "part" "SpeakingPartType" NOT NULL,
    "topic" TEXT,
    "prompt" TEXT NOT NULL,
    "subPrompts" JSONB,
    "preparationTime" INTEGER NOT NULL DEFAULT 0,
    "speakingTime" INTEGER NOT NULL DEFAULT 120,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SpeakingQuestion_pkey" PRIMARY KEY ("idSpeakingQuestion")
);

-- CreateTable
CREATE TABLE "UserSpeakingSubmission" (
    "idSpeakingSubmission" TEXT NOT NULL,
    "idUser" TEXT NOT NULL,
    "idSpeakingTask" TEXT NOT NULL,
    "audioUrl" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "SpeakingStatus" NOT NULL DEFAULT 'SUBMITTED',

    CONSTRAINT "UserSpeakingSubmission_pkey" PRIMARY KEY ("idSpeakingSubmission")
);

-- CreateTable
CREATE TABLE "SpeakingFeedback" (
    "idSpeakingFeedback" TEXT NOT NULL,
    "idSpeakingSubmission" TEXT NOT NULL,
    "fluencyAndCoherence" TEXT NOT NULL,
    "lexicalResource" TEXT NOT NULL,
    "grammaticalRangeAndAccuracy" TEXT NOT NULL,
    "pronunciation" TEXT NOT NULL,
    "generalFeedback" TEXT NOT NULL,
    "detailedCorrections" JSONB,
    "gradedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpeakingFeedback_pkey" PRIMARY KEY ("idSpeakingFeedback")
);

-- CreateIndex
CREATE UNIQUE INDEX "SpeakingTask_idDe_key" ON "SpeakingTask"("idDe");

-- CreateIndex
CREATE UNIQUE INDEX "SpeakingFeedback_idSpeakingSubmission_key" ON "SpeakingFeedback"("idSpeakingSubmission");

-- AddForeignKey
ALTER TABLE "SpeakingTask" ADD CONSTRAINT "SpeakingTask_idDe_fkey" FOREIGN KEY ("idDe") REFERENCES "De"("idDe") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakingQuestion" ADD CONSTRAINT "SpeakingQuestion_idSpeakingTask_fkey" FOREIGN KEY ("idSpeakingTask") REFERENCES "SpeakingTask"("idSpeakingTask") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSpeakingSubmission" ADD CONSTRAINT "UserSpeakingSubmission_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSpeakingSubmission" ADD CONSTRAINT "UserSpeakingSubmission_idSpeakingTask_fkey" FOREIGN KEY ("idSpeakingTask") REFERENCES "SpeakingTask"("idSpeakingTask") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakingFeedback" ADD CONSTRAINT "SpeakingFeedback_idSpeakingSubmission_fkey" FOREIGN KEY ("idSpeakingSubmission") REFERENCES "UserSpeakingSubmission"("idSpeakingSubmission") ON DELETE CASCADE ON UPDATE CASCADE;

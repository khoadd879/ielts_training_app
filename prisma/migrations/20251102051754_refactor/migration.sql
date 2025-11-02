/*
  Warnings:

  - You are about to drop the column `idCauHoi` on the `Answer` table. All the data in the column will be lost.
  - You are about to drop the column `idCauHoi` on the `Option` table. All the data in the column will be lost.
  - You are about to drop the column `idDe` on the `Part` table. All the data in the column will be lost.
  - You are about to drop the column `idDe` on the `SpeakingTask` table. All the data in the column will be lost.
  - The primary key for the `UserAnswer` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `idBaiLam` on the `UserAnswer` table. All the data in the column will be lost.
  - You are about to drop the column `idCauHoi` on the `UserAnswer` table. All the data in the column will be lost.
  - You are about to drop the column `idDe` on the `UserTestResult` table. All the data in the column will be lost.
  - You are about to drop the column `idDe` on the `WritingTask` table. All the data in the column will be lost.
  - You are about to drop the column `prompt` on the `WritingTask` table. All the data in the column will be lost.
  - You are about to drop the `CauHoi` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `De` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DoanVan` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `NhomCauHoi` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TuVung` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[idTest]` on the table `SpeakingTask` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[idQuestion,idUser,idTestResult]` on the table `UserAnswer` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `idQuestion` to the `Answer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `idQuestion` to the `Option` table without a default value. This is not possible if the table is not empty.
  - Added the required column `idTest` to the `Part` table without a default value. This is not possible if the table is not empty.
  - Added the required column `idTest` to the `SpeakingTask` table without a default value. This is not possible if the table is not empty.
  - Added the required column `idQuestion` to the `UserAnswer` table without a default value. This is not possible if the table is not empty.
  - The required column `idUserAnswer` was added to the `UserAnswer` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `idTest` to the `UserTestResult` table without a default value. This is not possible if the table is not empty.
  - Added the required column `idTest` to the `WritingTask` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `WritingTask` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "VocabType" AS ENUM ('NOUN', 'VERB', 'ADJECTIVE', 'ADVERB', 'PHRASE', 'IDIOM', 'PREPOSITION', 'CONJUNCTION', 'INTERJECTION');

-- CreateEnum
CREATE TYPE "TestType" AS ENUM ('LISTENING', 'READING', 'WRITING', 'SPEAKING');

-- DropForeignKey
ALTER TABLE "public"."Answer" DROP CONSTRAINT "Answer_idCauHoi_fkey";

-- DropForeignKey
ALTER TABLE "public"."CauHoi" DROP CONSTRAINT "CauHoi_idNhomCauHoi_fkey";

-- DropForeignKey
ALTER TABLE "public"."CauHoi" DROP CONSTRAINT "CauHoi_idPart_fkey";

-- DropForeignKey
ALTER TABLE "public"."De" DROP CONSTRAINT "De_idUser_fkey";

-- DropForeignKey
ALTER TABLE "public"."DoanVan" DROP CONSTRAINT "DoanVan_idPart_fkey";

-- DropForeignKey
ALTER TABLE "public"."NhomCauHoi" DROP CONSTRAINT "NhomCauHoi_idDe_fkey";

-- DropForeignKey
ALTER TABLE "public"."NhomCauHoi" DROP CONSTRAINT "NhomCauHoi_idPart_fkey";

-- DropForeignKey
ALTER TABLE "public"."Option" DROP CONSTRAINT "Option_idCauHoi_fkey";

-- DropForeignKey
ALTER TABLE "public"."Part" DROP CONSTRAINT "Part_idDe_fkey";

-- DropForeignKey
ALTER TABLE "public"."SpeakingTask" DROP CONSTRAINT "SpeakingTask_idDe_fkey";

-- DropForeignKey
ALTER TABLE "public"."TuVung" DROP CONSTRAINT "TuVung_idTopic_fkey";

-- DropForeignKey
ALTER TABLE "public"."TuVung" DROP CONSTRAINT "TuVung_idUser_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserAnswer" DROP CONSTRAINT "UserAnswer_idCauHoi_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserTestResult" DROP CONSTRAINT "UserTestResult_idDe_fkey";

-- DropForeignKey
ALTER TABLE "public"."WritingTask" DROP CONSTRAINT "WritingTask_idDe_fkey";

-- DropIndex
DROP INDEX "public"."SpeakingTask_idDe_key";

-- DropIndex
DROP INDEX "public"."UserAnswer_idCauHoi_idUser_idTestResult_key";

-- AlterTable
ALTER TABLE "Answer" DROP COLUMN "idCauHoi",
ADD COLUMN     "idQuestion" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Option" DROP COLUMN "idCauHoi",
ADD COLUMN     "idQuestion" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Part" DROP COLUMN "idDe",
ADD COLUMN     "idTest" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "SpeakingTask" DROP COLUMN "idDe",
ADD COLUMN     "idTest" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "UserAnswer" DROP CONSTRAINT "UserAnswer_pkey",
DROP COLUMN "idBaiLam",
DROP COLUMN "idCauHoi",
ADD COLUMN     "idQuestion" TEXT NOT NULL,
ADD COLUMN     "idUserAnswer" TEXT NOT NULL,
ADD CONSTRAINT "UserAnswer_pkey" PRIMARY KEY ("idUserAnswer");

-- AlterTable
ALTER TABLE "UserTestResult" DROP COLUMN "idDe",
ADD COLUMN     "idTest" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "WritingTask" DROP COLUMN "idDe",
DROP COLUMN "prompt",
ADD COLUMN     "idTest" TEXT NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL;

-- DropTable
DROP TABLE "public"."CauHoi";

-- DropTable
DROP TABLE "public"."De";

-- DropTable
DROP TABLE "public"."DoanVan";

-- DropTable
DROP TABLE "public"."NhomCauHoi";

-- DropTable
DROP TABLE "public"."TuVung";

-- DropEnum
DROP TYPE "public"."loaiDe";

-- DropEnum
DROP TYPE "public"."loaiTuVung";

-- CreateTable
CREATE TABLE "Vocabulary" (
    "idVocab" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "phonetic" TEXT,
    "meaning" TEXT NOT NULL,
    "example" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "idUser" TEXT NOT NULL,
    "idTopic" TEXT,
    "VocabType" "VocabType" NOT NULL,
    "level" "Level",
    "correctStreak" INTEGER NOT NULL DEFAULT 0,
    "lastReviewed" TIMESTAMP(3),
    "xp" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Vocabulary_pkey" PRIMARY KEY ("idVocab")
);

-- CreateTable
CREATE TABLE "Test" (
    "idTest" TEXT NOT NULL,
    "idUser" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "testType" "TestType" NOT NULL,
    "img" TEXT,
    "description" TEXT,
    "numberQuestion" INTEGER NOT NULL,
    "audioUrl" TEXT,
    "level" "Level" NOT NULL DEFAULT 'Low',

    CONSTRAINT "Test_pkey" PRIMARY KEY ("idTest")
);

-- CreateTable
CREATE TABLE "Passage" (
    "idPassage" TEXT NOT NULL,
    "idPart" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "image" TEXT,
    "description" TEXT,
    "numberParagraph" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Passage_pkey" PRIMARY KEY ("idPassage")
);

-- CreateTable
CREATE TABLE "GroupOfQuestions" (
    "idGroupOfQuestions" TEXT NOT NULL,
    "idTest" TEXT NOT NULL,
    "idPart" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startingOrder" INTEGER NOT NULL,
    "endingOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "typeQuestion" "QuestionType" NOT NULL,

    CONSTRAINT "GroupOfQuestions_pkey" PRIMARY KEY ("idGroupOfQuestions")
);

-- CreateTable
CREATE TABLE "Question" (
    "idQuestion" TEXT NOT NULL,
    "idGroupOfQuestions" TEXT NOT NULL,
    "idPart" TEXT NOT NULL,
    "numberQuestion" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("idQuestion")
);

-- CreateIndex
CREATE UNIQUE INDEX "Passage_idPart_key" ON "Passage"("idPart");

-- CreateIndex
CREATE UNIQUE INDEX "SpeakingTask_idTest_key" ON "SpeakingTask"("idTest");

-- CreateIndex
CREATE UNIQUE INDEX "UserAnswer_idQuestion_idUser_idTestResult_key" ON "UserAnswer"("idQuestion", "idUser", "idTestResult");

-- AddForeignKey
ALTER TABLE "UserTestResult" ADD CONSTRAINT "UserTestResult_idTest_fkey" FOREIGN KEY ("idTest") REFERENCES "Test"("idTest") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vocabulary" ADD CONSTRAINT "Vocabulary_idTopic_fkey" FOREIGN KEY ("idTopic") REFERENCES "Topic"("idTopic") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vocabulary" ADD CONSTRAINT "Vocabulary_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Test" ADD CONSTRAINT "Test_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Part" ADD CONSTRAINT "Part_idTest_fkey" FOREIGN KEY ("idTest") REFERENCES "Test"("idTest") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Passage" ADD CONSTRAINT "Passage_idPart_fkey" FOREIGN KEY ("idPart") REFERENCES "Part"("idPart") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupOfQuestions" ADD CONSTRAINT "GroupOfQuestions_idTest_fkey" FOREIGN KEY ("idTest") REFERENCES "Test"("idTest") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupOfQuestions" ADD CONSTRAINT "GroupOfQuestions_idPart_fkey" FOREIGN KEY ("idPart") REFERENCES "Part"("idPart") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_idGroupOfQuestions_fkey" FOREIGN KEY ("idGroupOfQuestions") REFERENCES "GroupOfQuestions"("idGroupOfQuestions") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_idPart_fkey" FOREIGN KEY ("idPart") REFERENCES "Part"("idPart") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Option" ADD CONSTRAINT "Option_idQuestion_fkey" FOREIGN KEY ("idQuestion") REFERENCES "Question"("idQuestion") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_idQuestion_fkey" FOREIGN KEY ("idQuestion") REFERENCES "Question"("idQuestion") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAnswer" ADD CONSTRAINT "UserAnswer_idQuestion_fkey" FOREIGN KEY ("idQuestion") REFERENCES "Question"("idQuestion") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WritingTask" ADD CONSTRAINT "WritingTask_idTest_fkey" FOREIGN KEY ("idTest") REFERENCES "Test"("idTest") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakingTask" ADD CONSTRAINT "SpeakingTask_idTest_fkey" FOREIGN KEY ("idTest") REFERENCES "Test"("idTest") ON DELETE CASCADE ON UPDATE CASCADE;

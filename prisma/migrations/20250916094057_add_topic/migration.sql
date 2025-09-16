/*
  Warnings:

  - You are about to drop the column `idLoaiTuVung` on the `TuVung` table. All the data in the column will be lost.
  - You are about to drop the `LoaiTuVung` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `loaiTuVung` to the `TuVung` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."loaiTuVung" AS ENUM ('NOUN', 'VERB', 'ADJECTIVE', 'ADVERB', 'PHRASE', 'IDIOM', 'PREPOSITION', 'CONJUNCTION', 'INTERJECTION');

-- DropForeignKey
ALTER TABLE "public"."TuVung" DROP CONSTRAINT "TuVung_idLoaiTuVung_fkey";

-- AlterTable
ALTER TABLE "public"."TuVung" DROP COLUMN "idLoaiTuVung",
ADD COLUMN     "idTopic" TEXT,
ADD COLUMN     "loaiTuVung" "public"."loaiTuVung" NOT NULL;

-- DropTable
DROP TABLE "public"."LoaiTuVung";

-- CreateTable
CREATE TABLE "public"."Topic" (
    "idTopic" TEXT NOT NULL,
    "nameTopic" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("idTopic")
);

-- AddForeignKey
ALTER TABLE "public"."TuVung" ADD CONSTRAINT "TuVung_idTopic_fkey" FOREIGN KEY ("idTopic") REFERENCES "public"."Topic"("idTopic") ON DELETE SET NULL ON UPDATE CASCADE;

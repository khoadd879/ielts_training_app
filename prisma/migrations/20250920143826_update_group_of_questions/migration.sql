/*
  Warnings:

  - Changed the type of `typeQuestion` on the `NhomCauHoi` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "public"."QuestionType" AS ENUM ('MCQ', 'TFNG', 'YES_NO_NOTGIVEN', 'MATCHING', 'FILL_BLANK', 'LABELING', 'SHORT_ANSWER', 'OTHER');

-- AlterTable
ALTER TABLE "public"."NhomCauHoi" DROP COLUMN "typeQuestion",
ADD COLUMN     "typeQuestion" "public"."QuestionType" NOT NULL;

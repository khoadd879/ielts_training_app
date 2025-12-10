/*
  Warnings:

  - You are about to drop the column `idOption` on the `Answer` table. All the data in the column will be lost.
  - You are about to drop the column `idOption` on the `UserAnswer` table. All the data in the column will be lost.
  - You are about to drop the `Option` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Answer" DROP CONSTRAINT "Answer_idOption_fkey";

-- DropForeignKey
ALTER TABLE "public"."Option" DROP CONSTRAINT "Option_idQuestion_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserAnswer" DROP CONSTRAINT "UserAnswer_idOption_fkey";

-- AlterTable
ALTER TABLE "Answer" DROP COLUMN "idOption";

-- AlterTable
ALTER TABLE "UserAnswer" DROP COLUMN "idOption";

-- DropTable
DROP TABLE "public"."Option";

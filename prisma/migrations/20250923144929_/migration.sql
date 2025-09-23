/*
  Warnings:

  - Made the column `idTestResult` on table `UserAnswer` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "public"."UserAnswer" DROP CONSTRAINT "UserAnswer_idTestResult_fkey";

-- AlterTable
ALTER TABLE "public"."UserAnswer" ALTER COLUMN "idTestResult" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."UserAnswer" ADD CONSTRAINT "UserAnswer_idTestResult_fkey" FOREIGN KEY ("idTestResult") REFERENCES "public"."UserTestResult"("idTestResult") ON DELETE RESTRICT ON UPDATE CASCADE;

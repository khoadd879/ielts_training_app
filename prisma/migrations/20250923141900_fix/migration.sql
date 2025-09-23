/*
  Warnings:

  - You are about to drop the column `timeRemaining` on the `UserAnswer` table. All the data in the column will be lost.
  - You are about to drop the column `timeSpent` on the `UserAnswer` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[idCauHoi,idUser,idTestResult]` on the table `UserAnswer` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userAnswerType` to the `UserAnswer` table without a default value. This is not possible if the table is not empty.
  - Made the column `submitted_at` on table `UserAnswer` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."UserAnswer" DROP COLUMN "timeRemaining",
DROP COLUMN "timeSpent",
ADD COLUMN     "userAnswerType" "public"."QuestionType" NOT NULL,
ALTER COLUMN "submitted_at" SET NOT NULL,
ALTER COLUMN "submitted_at" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "UserAnswer_idCauHoi_idUser_idTestResult_key" ON "public"."UserAnswer"("idCauHoi", "idUser", "idTestResult");

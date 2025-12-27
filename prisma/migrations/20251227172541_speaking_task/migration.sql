/*
  Warnings:

  - You are about to drop the column `part` on the `SpeakingQuestion` table. All the data in the column will be lost.
  - You are about to drop the column `audioPromptUrl` on the `SpeakingTask` table. All the data in the column will be lost.
  - You are about to drop the column `part` on the `UserSpeakingSubmission` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[idTest,part]` on the table `SpeakingTask` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `part` to the `SpeakingTask` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SpeakingQuestion" DROP COLUMN "part";

-- AlterTable
ALTER TABLE "SpeakingTask" DROP COLUMN "audioPromptUrl",
ADD COLUMN     "part" "SpeakingPartType" NOT NULL;

-- AlterTable
ALTER TABLE "UserSpeakingSubmission" DROP COLUMN "part";

-- CreateIndex
CREATE UNIQUE INDEX "SpeakingTask_idTest_part_key" ON "SpeakingTask"("idTest", "part");

-- DropIndex
DROP INDEX "SpeakingTask_idTest_key";

-- AlterTable
ALTER TABLE "UserSpeakingSubmission" ADD COLUMN     "idTestResult" TEXT;

-- AddForeignKey
ALTER TABLE "UserSpeakingSubmission" ADD CONSTRAINT "UserSpeakingSubmission_idTestResult_fkey" FOREIGN KEY ("idTestResult") REFERENCES "UserTestResult"("idTestResult") ON DELETE SET NULL ON UPDATE CASCADE;

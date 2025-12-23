-- AlterTable
ALTER TABLE "UserWritingSubmission" ADD COLUMN     "idTestResult" TEXT;

-- AddForeignKey
ALTER TABLE "UserWritingSubmission" ADD CONSTRAINT "UserWritingSubmission_idTestResult_fkey" FOREIGN KEY ("idTestResult") REFERENCES "UserTestResult"("idTestResult") ON DELETE CASCADE ON UPDATE CASCADE;

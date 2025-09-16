-- AlterTable
ALTER TABLE "public"."UserAnswer" ADD COLUMN     "idTestResult" TEXT,
ADD COLUMN     "matching_key" TEXT,
ADD COLUMN     "matching_value" TEXT;

-- AddForeignKey
ALTER TABLE "public"."UserAnswer" ADD CONSTRAINT "UserAnswer_idTestResult_fkey" FOREIGN KEY ("idTestResult") REFERENCES "public"."UserTestResult"("idTestResult") ON DELETE SET NULL ON UPDATE CASCADE;

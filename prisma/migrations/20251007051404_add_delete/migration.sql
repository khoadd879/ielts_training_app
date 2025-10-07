-- DropForeignKey
ALTER TABLE "public"."Answer" DROP CONSTRAINT "Answer_idCauHoi_fkey";

-- DropForeignKey
ALTER TABLE "public"."Answer" DROP CONSTRAINT "Answer_idOption_fkey";

-- DropForeignKey
ALTER TABLE "public"."CauHoi" DROP CONSTRAINT "CauHoi_idNhomCauHoi_fkey";

-- DropForeignKey
ALTER TABLE "public"."CauHoi" DROP CONSTRAINT "CauHoi_idPart_fkey";

-- DropForeignKey
ALTER TABLE "public"."De" DROP CONSTRAINT "De_idUser_fkey";

-- DropForeignKey
ALTER TABLE "public"."DoanVan" DROP CONSTRAINT "DoanVan_idPart_fkey";

-- DropForeignKey
ALTER TABLE "public"."ForumComment" DROP CONSTRAINT "ForumComment_idUser_fkey";

-- DropForeignKey
ALTER TABLE "public"."ForumCommentLikes" DROP CONSTRAINT "ForumCommentLikes_idUser_fkey";

-- DropForeignKey
ALTER TABLE "public"."ForumPost" DROP CONSTRAINT "ForumPost_idUser_fkey";

-- DropForeignKey
ALTER TABLE "public"."ForumPostLikes" DROP CONSTRAINT "ForumPostLikes_idUser_fkey";

-- DropForeignKey
ALTER TABLE "public"."ForumThreads" DROP CONSTRAINT "ForumThreads_idUser_fkey";

-- DropForeignKey
ALTER TABLE "public"."NhomCauHoi" DROP CONSTRAINT "NhomCauHoi_idDe_fkey";

-- DropForeignKey
ALTER TABLE "public"."NhomCauHoi" DROP CONSTRAINT "NhomCauHoi_idPart_fkey";

-- DropForeignKey
ALTER TABLE "public"."Option" DROP CONSTRAINT "Option_idCauHoi_fkey";

-- DropForeignKey
ALTER TABLE "public"."Part" DROP CONSTRAINT "Part_idDe_fkey";

-- DropForeignKey
ALTER TABLE "public"."Topic" DROP CONSTRAINT "Topic_idUser_fkey";

-- DropForeignKey
ALTER TABLE "public"."TuVung" DROP CONSTRAINT "TuVung_idTopic_fkey";

-- DropForeignKey
ALTER TABLE "public"."TuVung" DROP CONSTRAINT "TuVung_idUser_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserAnswer" DROP CONSTRAINT "UserAnswer_idCauHoi_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserAnswer" DROP CONSTRAINT "UserAnswer_idOption_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserAnswer" DROP CONSTRAINT "UserAnswer_idTestResult_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserAnswer" DROP CONSTRAINT "UserAnswer_idUser_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserTestResult" DROP CONSTRAINT "UserTestResult_idDe_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserTestResult" DROP CONSTRAINT "UserTestResult_idUser_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserWritingSubmission" DROP CONSTRAINT "UserWritingSubmission_idUser_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserWritingSubmission" DROP CONSTRAINT "UserWritingSubmission_idWritingTask_fkey";

-- DropForeignKey
ALTER TABLE "public"."VerificationCode" DROP CONSTRAINT "VerificationCode_idUser_fkey";

-- DropForeignKey
ALTER TABLE "public"."WritingTask" DROP CONSTRAINT "WritingTask_idDe_fkey";

-- AddForeignKey
ALTER TABLE "public"."VerificationCode" ADD CONSTRAINT "VerificationCode_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "public"."User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserTestResult" ADD CONSTRAINT "UserTestResult_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "public"."User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserTestResult" ADD CONSTRAINT "UserTestResult_idDe_fkey" FOREIGN KEY ("idDe") REFERENCES "public"."De"("idDe") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TuVung" ADD CONSTRAINT "TuVung_idTopic_fkey" FOREIGN KEY ("idTopic") REFERENCES "public"."Topic"("idTopic") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TuVung" ADD CONSTRAINT "TuVung_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "public"."User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Topic" ADD CONSTRAINT "Topic_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "public"."User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."De" ADD CONSTRAINT "De_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "public"."User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Part" ADD CONSTRAINT "Part_idDe_fkey" FOREIGN KEY ("idDe") REFERENCES "public"."De"("idDe") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DoanVan" ADD CONSTRAINT "DoanVan_idPart_fkey" FOREIGN KEY ("idPart") REFERENCES "public"."Part"("idPart") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NhomCauHoi" ADD CONSTRAINT "NhomCauHoi_idDe_fkey" FOREIGN KEY ("idDe") REFERENCES "public"."De"("idDe") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NhomCauHoi" ADD CONSTRAINT "NhomCauHoi_idPart_fkey" FOREIGN KEY ("idPart") REFERENCES "public"."Part"("idPart") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CauHoi" ADD CONSTRAINT "CauHoi_idNhomCauHoi_fkey" FOREIGN KEY ("idNhomCauHoi") REFERENCES "public"."NhomCauHoi"("idNhomCauHoi") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CauHoi" ADD CONSTRAINT "CauHoi_idPart_fkey" FOREIGN KEY ("idPart") REFERENCES "public"."Part"("idPart") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Option" ADD CONSTRAINT "Option_idCauHoi_fkey" FOREIGN KEY ("idCauHoi") REFERENCES "public"."CauHoi"("idCauHoi") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Answer" ADD CONSTRAINT "Answer_idCauHoi_fkey" FOREIGN KEY ("idCauHoi") REFERENCES "public"."CauHoi"("idCauHoi") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Answer" ADD CONSTRAINT "Answer_idOption_fkey" FOREIGN KEY ("idOption") REFERENCES "public"."Option"("idOption") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserAnswer" ADD CONSTRAINT "UserAnswer_idCauHoi_fkey" FOREIGN KEY ("idCauHoi") REFERENCES "public"."CauHoi"("idCauHoi") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserAnswer" ADD CONSTRAINT "UserAnswer_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "public"."User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserAnswer" ADD CONSTRAINT "UserAnswer_idOption_fkey" FOREIGN KEY ("idOption") REFERENCES "public"."Option"("idOption") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserAnswer" ADD CONSTRAINT "UserAnswer_idTestResult_fkey" FOREIGN KEY ("idTestResult") REFERENCES "public"."UserTestResult"("idTestResult") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WritingTask" ADD CONSTRAINT "WritingTask_idDe_fkey" FOREIGN KEY ("idDe") REFERENCES "public"."De"("idDe") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserWritingSubmission" ADD CONSTRAINT "UserWritingSubmission_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "public"."User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserWritingSubmission" ADD CONSTRAINT "UserWritingSubmission_idWritingTask_fkey" FOREIGN KEY ("idWritingTask") REFERENCES "public"."WritingTask"("idWritingTask") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ForumThreads" ADD CONSTRAINT "ForumThreads_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "public"."User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ForumPost" ADD CONSTRAINT "ForumPost_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "public"."User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ForumComment" ADD CONSTRAINT "ForumComment_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "public"."User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ForumPostLikes" ADD CONSTRAINT "ForumPostLikes_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "public"."User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ForumCommentLikes" ADD CONSTRAINT "ForumCommentLikes_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "public"."User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE;

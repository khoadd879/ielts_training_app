-- CreateIndex
CREATE INDEX "ForumPost_idForumThreads_created_at_idx" ON "ForumPost"("idForumThreads", "created_at");

-- CreateIndex
CREATE INDEX "UserAnswer_idTestResult_isCorrect_idx" ON "UserAnswer"("idTestResult", "isCorrect");

-- CreateIndex
CREATE INDEX "UserTestResult_idUser_status_finishedAt_idx" ON "UserTestResult"("idUser", "status", "finishedAt");

-- CreateIndex
CREATE INDEX "UserTestResult_idTest_createdAt_idx" ON "UserTestResult"("idTest", "createdAt");

-- CreateIndex
CREATE INDEX "UserWritingSubmission_idUser_status_submitted_at_idx" ON "UserWritingSubmission"("idUser", "status", "submitted_at");

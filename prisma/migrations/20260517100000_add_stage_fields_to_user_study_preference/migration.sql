-- AddStageFieldsToUserStudyPreference
ALTER TABLE "user_study_preference" ADD COLUMN "currentStage" TEXT DEFAULT 'FOUNDATION';
ALTER TABLE "user_study_preference" ADD COLUMN "weeksInCurrentStage" INT DEFAULT 0;
ALTER TABLE "user_study_preference" ADD COLUMN "stageStartDate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
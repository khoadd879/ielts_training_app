-- CreateUserDailyTaskCompletion
CREATE TABLE "user_daily_task_completion" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "idUser" TEXT NOT NULL,
    "idStudyPlan" VARCHAR(255) NOT NULL,
    "taskType" VARCHAR(255) NOT NULL,
    "date" DATE NOT NULL,
    "completed" BOOLEAN DEFAULT false,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "user_daily_task_completion_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Add index for unique constraint
CREATE UNIQUE INDEX "user_daily_task_completion_idUser_idStudyPlan_taskType_date_key" ON "user_daily_task_completion"("idUser", "idStudyPlan", "taskType", "date");
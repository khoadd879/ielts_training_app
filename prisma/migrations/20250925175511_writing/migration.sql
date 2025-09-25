/*
  Warnings:

  - Changed the type of `task_type` on the `WritingTask` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "public"."WritingTaskType" AS ENUM ('TASK1', 'TASK2');

-- CreateEnum
CREATE TYPE "public"."WritingStatus" AS ENUM ('SUBMITTED', 'GRADED');

-- AlterTable
ALTER TABLE "public"."UserWritingSubmission" ADD COLUMN     "status" "public"."WritingStatus" NOT NULL DEFAULT 'SUBMITTED';

-- AlterTable
ALTER TABLE "public"."WritingTask" DROP COLUMN "task_type",
ADD COLUMN     "task_type" "public"."WritingTaskType" NOT NULL;

-- CreateEnum
CREATE TYPE "AssignMode" AS ENUM ('AUTO', 'MANUAL');

-- AlterTable
ALTER TABLE "SystemConfig" ADD COLUMN     "assignMode" "AssignMode" NOT NULL DEFAULT 'MANUAL';

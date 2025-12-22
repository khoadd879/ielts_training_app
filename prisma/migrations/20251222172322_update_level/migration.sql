/*
  Warnings:

  - Made the column `level` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "User" ALTER COLUMN "level" SET NOT NULL,
ALTER COLUMN "level" SET DEFAULT 'Low';

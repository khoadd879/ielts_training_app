/*
  Warnings:

  - Made the column `gender` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."User" ALTER COLUMN "gender" SET NOT NULL,
ALTER COLUMN "gender" SET DEFAULT 'Male';

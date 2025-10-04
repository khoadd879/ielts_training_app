/*
  Warnings:

  - You are about to drop the column `views_count` on the `ForumThreads` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."ForumThreads" DROP COLUMN "views_count";

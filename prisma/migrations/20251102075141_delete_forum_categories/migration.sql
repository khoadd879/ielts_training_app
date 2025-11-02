/*
  Warnings:

  - You are about to drop the `ForumCategories` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."ForumThreads" DROP CONSTRAINT "ForumThreads_idForumCategories_fkey";

-- DropTable
DROP TABLE "public"."ForumCategories";

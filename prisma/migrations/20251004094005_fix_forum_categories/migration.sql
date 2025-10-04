/*
  Warnings:

  - You are about to drop the column `Name` on the `ForumCategories` table. All the data in the column will be lost.
  - Added the required column `nameForum` to the `ForumCategories` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."ForumCategories" DROP COLUMN "Name",
ADD COLUMN     "nameForum" TEXT NOT NULL;

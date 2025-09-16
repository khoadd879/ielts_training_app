/*
  Warnings:

  - You are about to drop the column `desciption` on the `De` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."De" DROP COLUMN "desciption",
ADD COLUMN     "description" TEXT;

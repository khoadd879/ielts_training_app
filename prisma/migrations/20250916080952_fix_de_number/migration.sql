/*
  Warnings:

  - You are about to drop the column `numerQuestion` on the `De` table. All the data in the column will be lost.
  - Added the required column `numberQuestion` to the `De` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."De" DROP COLUMN "numerQuestion",
ADD COLUMN     "numberQuestion" INTEGER NOT NULL;

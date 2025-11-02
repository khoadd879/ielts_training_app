/*
  Warnings:

  - You are about to drop the column `endingOrder` on the `GroupOfQuestions` table. All the data in the column will be lost.
  - You are about to drop the column `startingOrder` on the `GroupOfQuestions` table. All the data in the column will be lost.
  - Added the required column `quantity` to the `GroupOfQuestions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "GroupOfQuestions" DROP COLUMN "endingOrder",
DROP COLUMN "startingOrder",
ADD COLUMN     "quantity" INTEGER NOT NULL;

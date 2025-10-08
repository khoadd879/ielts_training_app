/*
  Warnings:

  - A unique constraint covering the columns `[idUser,name]` on the table `GrammarCategory` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."GrammarCategory_name_key";

-- AlterTable
ALTER TABLE "public"."GrammarCategory" ADD COLUMN     "idUser" TEXT;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "currentStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastStudiedAt" TIMESTAMP(3),
ADD COLUMN     "longestStreak" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "GrammarCategory_idUser_name_key" ON "public"."GrammarCategory"("idUser", "name");

-- AddForeignKey
ALTER TABLE "public"."GrammarCategory" ADD CONSTRAINT "GrammarCategory_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "public"."User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE;

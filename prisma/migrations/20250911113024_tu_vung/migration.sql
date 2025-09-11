/*
  Warnings:

  - Made the column `idUser` on table `TuVung` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "public"."TuVung" DROP CONSTRAINT "TuVung_idUser_fkey";

-- AlterTable
ALTER TABLE "public"."TuVung" ALTER COLUMN "idUser" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."TuVung" ADD CONSTRAINT "TuVung_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "public"."User"("idUser") ON DELETE RESTRICT ON UPDATE CASCADE;

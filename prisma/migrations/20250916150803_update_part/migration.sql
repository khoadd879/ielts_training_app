/*
  Warnings:

  - Added the required column `idUser` to the `Part` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Part" ADD COLUMN     "idUser" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Part" ADD CONSTRAINT "Part_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "public"."User"("idUser") ON DELETE RESTRICT ON UPDATE CASCADE;

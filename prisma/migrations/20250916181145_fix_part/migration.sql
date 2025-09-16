/*
  Warnings:

  - You are about to drop the column `idUser` on the `Part` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Part" DROP CONSTRAINT "Part_idUser_fkey";

-- AlterTable
ALTER TABLE "public"."Part" DROP COLUMN "idUser";

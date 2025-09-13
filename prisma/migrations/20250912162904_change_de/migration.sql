/*
  Warnings:

  - You are about to drop the column `idLoaiDe` on the `De` table. All the data in the column will be lost.
  - You are about to drop the `LoaiDe` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `loaiDe` to the `De` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."loaiDe" AS ENUM ('LISTENING', 'READING', 'WRITING', 'SPEAKING');

-- DropForeignKey
ALTER TABLE "public"."De" DROP CONSTRAINT "De_idLoaiDe_fkey";

-- AlterTable
ALTER TABLE "public"."De" DROP COLUMN "idLoaiDe",
ADD COLUMN     "loaiDe" "public"."loaiDe" NOT NULL;

-- DropTable
DROP TABLE "public"."LoaiDe";

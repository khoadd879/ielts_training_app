/*
  Warnings:

  - You are about to drop the column `code_expiration` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `code_id` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "code_expiration",
DROP COLUMN "code_id";

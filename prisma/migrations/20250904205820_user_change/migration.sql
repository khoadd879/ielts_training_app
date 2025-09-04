/*
  Warnings:

  - A unique constraint covering the columns `[idPart]` on the table `DoanVan` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "code_expiration" TIMESTAMP(3),
ADD COLUMN     "code_id" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "DoanVan_idPart_key" ON "public"."DoanVan"("idPart");

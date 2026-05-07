-- AlterTable
ALTER TABLE "TeacherReviewTicket" ALTER COLUMN "idTicket" DROP DEFAULT;

-- CreateTable
CREATE TABLE "SystemConfig" (
    "idConfig" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("idConfig")
);

-- CreateIndex
CREATE UNIQUE INDEX "SystemConfig_idConfig_key" ON "SystemConfig"("idConfig");

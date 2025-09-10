-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "code_expiration" TIMESTAMP(3),
ADD COLUMN     "code_id" TEXT;

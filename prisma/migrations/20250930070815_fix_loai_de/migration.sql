/*
  Warnings:

  - The values [SPEAKING] on the enum `loaiDe` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."loaiDe_new" AS ENUM ('LISTENING', 'READING', 'WRITING');
ALTER TABLE "public"."De" ALTER COLUMN "loaiDe" TYPE "public"."loaiDe_new" USING ("loaiDe"::text::"public"."loaiDe_new");
ALTER TYPE "public"."loaiDe" RENAME TO "loaiDe_old";
ALTER TYPE "public"."loaiDe_new" RENAME TO "loaiDe";
DROP TYPE "public"."loaiDe_old";
COMMIT;

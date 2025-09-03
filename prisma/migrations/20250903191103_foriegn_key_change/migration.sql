/*
  Warnings:

  - The values [MOD] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - The primary key for the `Answer` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `CauHoi` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `De` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `DoanVan` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `LoaiDe` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `LoaiTuVung` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `NhomCauHoi` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Option` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Part` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `TuVung` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `accountType` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `UserAnswer` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `UserTestResult` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `UserWritingSubmission` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `WritingTask` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- CreateEnum
CREATE TYPE "public"."accountType" AS ENUM ('LOCAL', 'GOOGLE');

-- AlterEnum
BEGIN;
CREATE TYPE "public"."Role_new" AS ENUM ('USER', 'ADMIN', 'GIAOVIEN');
ALTER TABLE "public"."User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "public"."User" ALTER COLUMN "role" TYPE "public"."Role_new" USING ("role"::text::"public"."Role_new");
ALTER TYPE "public"."Role" RENAME TO "Role_old";
ALTER TYPE "public"."Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
ALTER TABLE "public"."User" ALTER COLUMN "role" SET DEFAULT 'USER';
COMMIT;

-- AlterTable
ALTER TABLE "public"."Answer" DROP CONSTRAINT "Answer_pkey",
ALTER COLUMN "idAnswer" DROP DEFAULT,
ALTER COLUMN "idAnswer" SET DATA TYPE TEXT,
ALTER COLUMN "idCauHoi" SET DATA TYPE TEXT,
ALTER COLUMN "idOption" SET DATA TYPE TEXT,
ADD CONSTRAINT "Answer_pkey" PRIMARY KEY ("idAnswer");
DROP SEQUENCE "Answer_idAnswer_seq";

-- AlterTable
ALTER TABLE "public"."CauHoi" DROP CONSTRAINT "CauHoi_pkey",
ALTER COLUMN "idCauHoi" DROP DEFAULT,
ALTER COLUMN "idCauHoi" SET DATA TYPE TEXT,
ALTER COLUMN "idNhomCauHoi" SET DATA TYPE TEXT,
ALTER COLUMN "idPart" SET DATA TYPE TEXT,
ADD CONSTRAINT "CauHoi_pkey" PRIMARY KEY ("idCauHoi");
DROP SEQUENCE "CauHoi_idCauHoi_seq";

-- AlterTable
ALTER TABLE "public"."De" DROP CONSTRAINT "De_pkey",
ALTER COLUMN "idDe" DROP DEFAULT,
ALTER COLUMN "idDe" SET DATA TYPE TEXT,
ALTER COLUMN "idUser" SET DATA TYPE TEXT,
ALTER COLUMN "idLoaiDe" SET DATA TYPE TEXT,
ADD CONSTRAINT "De_pkey" PRIMARY KEY ("idDe");
DROP SEQUENCE "De_idDe_seq";

-- AlterTable
ALTER TABLE "public"."DoanVan" DROP CONSTRAINT "DoanVan_pkey",
ALTER COLUMN "idDoanVan" DROP DEFAULT,
ALTER COLUMN "idDoanVan" SET DATA TYPE TEXT,
ALTER COLUMN "idPart" SET DATA TYPE TEXT,
ADD CONSTRAINT "DoanVan_pkey" PRIMARY KEY ("idDoanVan");
DROP SEQUENCE "DoanVan_idDoanVan_seq";

-- AlterTable
ALTER TABLE "public"."LoaiDe" DROP CONSTRAINT "LoaiDe_pkey",
ALTER COLUMN "idLoaiDe" DROP DEFAULT,
ALTER COLUMN "idLoaiDe" SET DATA TYPE TEXT,
ADD CONSTRAINT "LoaiDe_pkey" PRIMARY KEY ("idLoaiDe");
DROP SEQUENCE "LoaiDe_idLoaiDe_seq";

-- AlterTable
ALTER TABLE "public"."LoaiTuVung" DROP CONSTRAINT "LoaiTuVung_pkey",
ALTER COLUMN "idLoaiTuVung" DROP DEFAULT,
ALTER COLUMN "idLoaiTuVung" SET DATA TYPE TEXT,
ADD CONSTRAINT "LoaiTuVung_pkey" PRIMARY KEY ("idLoaiTuVung");
DROP SEQUENCE "LoaiTuVung_idLoaiTuVung_seq";

-- AlterTable
ALTER TABLE "public"."NhomCauHoi" DROP CONSTRAINT "NhomCauHoi_pkey",
ALTER COLUMN "idNhomCauHoi" DROP DEFAULT,
ALTER COLUMN "idNhomCauHoi" SET DATA TYPE TEXT,
ALTER COLUMN "idDe" SET DATA TYPE TEXT,
ALTER COLUMN "idPart" SET DATA TYPE TEXT,
ADD CONSTRAINT "NhomCauHoi_pkey" PRIMARY KEY ("idNhomCauHoi");
DROP SEQUENCE "NhomCauHoi_idNhomCauHoi_seq";

-- AlterTable
ALTER TABLE "public"."Option" DROP CONSTRAINT "Option_pkey",
ALTER COLUMN "idOption" DROP DEFAULT,
ALTER COLUMN "idOption" SET DATA TYPE TEXT,
ALTER COLUMN "idCauHoi" SET DATA TYPE TEXT,
ADD CONSTRAINT "Option_pkey" PRIMARY KEY ("idOption");
DROP SEQUENCE "Option_idOption_seq";

-- AlterTable
ALTER TABLE "public"."Part" DROP CONSTRAINT "Part_pkey",
ALTER COLUMN "idPart" DROP DEFAULT,
ALTER COLUMN "idPart" SET DATA TYPE TEXT,
ALTER COLUMN "idDe" SET DATA TYPE TEXT,
ADD CONSTRAINT "Part_pkey" PRIMARY KEY ("idPart");
DROP SEQUENCE "Part_idPart_seq";

-- AlterTable
ALTER TABLE "public"."TuVung" DROP CONSTRAINT "TuVung_pkey",
ADD COLUMN     "idUser" TEXT,
ALTER COLUMN "idTuVung" DROP DEFAULT,
ALTER COLUMN "idTuVung" SET DATA TYPE TEXT,
ALTER COLUMN "idLoaiTuVung" SET DATA TYPE TEXT,
ADD CONSTRAINT "TuVung_pkey" PRIMARY KEY ("idTuVung");
DROP SEQUENCE "TuVung_idTuVung_seq";

-- AlterTable
ALTER TABLE "public"."User" DROP CONSTRAINT "User_pkey",
ALTER COLUMN "idUser" DROP DEFAULT,
ALTER COLUMN "idUser" SET DATA TYPE TEXT,
DROP COLUMN "accountType",
ADD COLUMN     "accountType" "public"."accountType" NOT NULL DEFAULT 'LOCAL',
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("idUser");
DROP SEQUENCE "User_idUser_seq";

-- AlterTable
ALTER TABLE "public"."UserAnswer" DROP CONSTRAINT "UserAnswer_pkey",
ALTER COLUMN "idBaiLam" DROP DEFAULT,
ALTER COLUMN "idBaiLam" SET DATA TYPE TEXT,
ALTER COLUMN "idCauHoi" SET DATA TYPE TEXT,
ALTER COLUMN "idUser" SET DATA TYPE TEXT,
ALTER COLUMN "idOption" SET DATA TYPE TEXT,
ADD CONSTRAINT "UserAnswer_pkey" PRIMARY KEY ("idBaiLam");
DROP SEQUENCE "UserAnswer_idBaiLam_seq";

-- AlterTable
ALTER TABLE "public"."UserTestResult" DROP CONSTRAINT "UserTestResult_pkey",
ALTER COLUMN "idTestResult" DROP DEFAULT,
ALTER COLUMN "idTestResult" SET DATA TYPE TEXT,
ALTER COLUMN "idUser" SET DATA TYPE TEXT,
ALTER COLUMN "idDe" SET DATA TYPE TEXT,
ADD CONSTRAINT "UserTestResult_pkey" PRIMARY KEY ("idTestResult");
DROP SEQUENCE "UserTestResult_idTestResult_seq";

-- AlterTable
ALTER TABLE "public"."UserWritingSubmission" DROP CONSTRAINT "UserWritingSubmission_pkey",
ALTER COLUMN "idWritingSubmission" DROP DEFAULT,
ALTER COLUMN "idWritingSubmission" SET DATA TYPE TEXT,
ALTER COLUMN "idUser" SET DATA TYPE TEXT,
ALTER COLUMN "idWritingTask" SET DATA TYPE TEXT,
ADD CONSTRAINT "UserWritingSubmission_pkey" PRIMARY KEY ("idWritingSubmission");
DROP SEQUENCE "UserWritingSubmission_idWritingSubmission_seq";

-- AlterTable
ALTER TABLE "public"."WritingTask" DROP CONSTRAINT "WritingTask_pkey",
ALTER COLUMN "idWritingTask" DROP DEFAULT,
ALTER COLUMN "idWritingTask" SET DATA TYPE TEXT,
ALTER COLUMN "idDe" SET DATA TYPE TEXT,
ADD CONSTRAINT "WritingTask_pkey" PRIMARY KEY ("idWritingTask");
DROP SEQUENCE "WritingTask_idWritingTask_seq";

-- AddForeignKey
ALTER TABLE "public"."UserTestResult" ADD CONSTRAINT "UserTestResult_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "public"."User"("idUser") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserTestResult" ADD CONSTRAINT "UserTestResult_idDe_fkey" FOREIGN KEY ("idDe") REFERENCES "public"."De"("idDe") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TuVung" ADD CONSTRAINT "TuVung_idLoaiTuVung_fkey" FOREIGN KEY ("idLoaiTuVung") REFERENCES "public"."LoaiTuVung"("idLoaiTuVung") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TuVung" ADD CONSTRAINT "TuVung_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "public"."User"("idUser") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."De" ADD CONSTRAINT "De_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "public"."User"("idUser") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."De" ADD CONSTRAINT "De_idLoaiDe_fkey" FOREIGN KEY ("idLoaiDe") REFERENCES "public"."LoaiDe"("idLoaiDe") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Option" ADD CONSTRAINT "Option_idCauHoi_fkey" FOREIGN KEY ("idCauHoi") REFERENCES "public"."CauHoi"("idCauHoi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Answer" ADD CONSTRAINT "Answer_idCauHoi_fkey" FOREIGN KEY ("idCauHoi") REFERENCES "public"."CauHoi"("idCauHoi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Answer" ADD CONSTRAINT "Answer_idOption_fkey" FOREIGN KEY ("idOption") REFERENCES "public"."Option"("idOption") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserAnswer" ADD CONSTRAINT "UserAnswer_idCauHoi_fkey" FOREIGN KEY ("idCauHoi") REFERENCES "public"."CauHoi"("idCauHoi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserAnswer" ADD CONSTRAINT "UserAnswer_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "public"."User"("idUser") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserAnswer" ADD CONSTRAINT "UserAnswer_idOption_fkey" FOREIGN KEY ("idOption") REFERENCES "public"."Option"("idOption") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Part" ADD CONSTRAINT "Part_idDe_fkey" FOREIGN KEY ("idDe") REFERENCES "public"."De"("idDe") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DoanVan" ADD CONSTRAINT "DoanVan_idPart_fkey" FOREIGN KEY ("idPart") REFERENCES "public"."Part"("idPart") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NhomCauHoi" ADD CONSTRAINT "NhomCauHoi_idDe_fkey" FOREIGN KEY ("idDe") REFERENCES "public"."De"("idDe") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NhomCauHoi" ADD CONSTRAINT "NhomCauHoi_idPart_fkey" FOREIGN KEY ("idPart") REFERENCES "public"."Part"("idPart") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CauHoi" ADD CONSTRAINT "CauHoi_idNhomCauHoi_fkey" FOREIGN KEY ("idNhomCauHoi") REFERENCES "public"."NhomCauHoi"("idNhomCauHoi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CauHoi" ADD CONSTRAINT "CauHoi_idPart_fkey" FOREIGN KEY ("idPart") REFERENCES "public"."Part"("idPart") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WritingTask" ADD CONSTRAINT "WritingTask_idDe_fkey" FOREIGN KEY ("idDe") REFERENCES "public"."De"("idDe") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserWritingSubmission" ADD CONSTRAINT "UserWritingSubmission_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "public"."User"("idUser") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserWritingSubmission" ADD CONSTRAINT "UserWritingSubmission_idWritingTask_fkey" FOREIGN KEY ("idWritingTask") REFERENCES "public"."WritingTask"("idWritingTask") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('USER', 'ADMIN', 'MOD');

-- CreateTable
CREATE TABLE "public"."User" (
    "idUser" SERIAL NOT NULL,
    "nameUser" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "address" TEXT,
    "accountType" TEXT DEFAULT 'LOCAL',
    "role" "public"."Role" NOT NULL DEFAULT 'USER',
    "avatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("idUser")
);

-- CreateTable
CREATE TABLE "public"."UserTestResult" (
    "idTestResult" SERIAL NOT NULL,
    "idUser" INTEGER NOT NULL,
    "idDe" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "total_correct" INTEGER NOT NULL,
    "total_questions" INTEGER NOT NULL,
    "raw_score" INTEGER NOT NULL,
    "band_score" DOUBLE PRECISION NOT NULL,
    "duration" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTestResult_pkey" PRIMARY KEY ("idTestResult")
);

-- CreateTable
CREATE TABLE "public"."LoaiTuVung" (
    "idLoaiTuVung" SERIAL NOT NULL,
    "nameLoaiTuVung" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoaiTuVung_pkey" PRIMARY KEY ("idLoaiTuVung")
);

-- CreateTable
CREATE TABLE "public"."TuVung" (
    "idTuVung" SERIAL NOT NULL,
    "idLoaiTuVung" INTEGER NOT NULL,
    "word" TEXT NOT NULL,
    "phonetic" TEXT,
    "meaning" TEXT NOT NULL,
    "example" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TuVung_pkey" PRIMARY KEY ("idTuVung")
);

-- CreateTable
CREATE TABLE "public"."LoaiDe" (
    "idLoaiDe" SERIAL NOT NULL,
    "nameLoaiDe" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoaiDe_pkey" PRIMARY KEY ("idLoaiDe")
);

-- CreateTable
CREATE TABLE "public"."De" (
    "idDe" SERIAL NOT NULL,
    "idUser" INTEGER NOT NULL,
    "idLoaiDe" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "desciption" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "numerQuestion" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "De_pkey" PRIMARY KEY ("idDe")
);

-- CreateTable
CREATE TABLE "public"."Option" (
    "idOption" SERIAL NOT NULL,
    "idCauHoi" INTEGER NOT NULL,
    "option_label" TEXT NOT NULL,
    "option_content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Option_pkey" PRIMARY KEY ("idOption")
);

-- CreateTable
CREATE TABLE "public"."Answer" (
    "idAnswer" SERIAL NOT NULL,
    "idCauHoi" INTEGER NOT NULL,
    "idOption" INTEGER,
    "answer_text" TEXT,
    "matching_key" TEXT,
    "matching_value" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("idAnswer")
);

-- CreateTable
CREATE TABLE "public"."UserAnswer" (
    "idBaiLam" SERIAL NOT NULL,
    "idCauHoi" INTEGER NOT NULL,
    "idUser" INTEGER NOT NULL,
    "idOption" INTEGER,
    "answerText" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UserAnswer_pkey" PRIMARY KEY ("idBaiLam")
);

-- CreateTable
CREATE TABLE "public"."Part" (
    "idPart" SERIAL NOT NULL,
    "idDe" INTEGER NOT NULL,
    "namePart" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Part_pkey" PRIMARY KEY ("idPart")
);

-- CreateTable
CREATE TABLE "public"."DoanVan" (
    "idDoanVan" SERIAL NOT NULL,
    "idPart" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "image" TEXT,
    "description" TEXT,
    "numberParagraph" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoanVan_pkey" PRIMARY KEY ("idDoanVan")
);

-- CreateTable
CREATE TABLE "public"."NhomCauHoi" (
    "idNhomCauHoi" SERIAL NOT NULL,
    "idDe" INTEGER NOT NULL,
    "idPart" INTEGER NOT NULL,
    "typeQuestion" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startingOrder" INTEGER NOT NULL,
    "endingOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NhomCauHoi_pkey" PRIMARY KEY ("idNhomCauHoi")
);

-- CreateTable
CREATE TABLE "public"."CauHoi" (
    "idCauHoi" SERIAL NOT NULL,
    "idNhomCauHoi" INTEGER NOT NULL,
    "idPart" INTEGER NOT NULL,
    "numberQuestion" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CauHoi_pkey" PRIMARY KEY ("idCauHoi")
);

-- CreateTable
CREATE TABLE "public"."WritingTask" (
    "idWritingTask" SERIAL NOT NULL,
    "idDe" INTEGER NOT NULL,
    "task_type" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "time_limit" INTEGER NOT NULL,
    "word_limit" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WritingTask_pkey" PRIMARY KEY ("idWritingTask")
);

-- CreateTable
CREATE TABLE "public"."UserWritingSubmission" (
    "idWritingSubmission" SERIAL NOT NULL,
    "idUser" INTEGER NOT NULL,
    "idWritingTask" INTEGER NOT NULL,
    "submission_text" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "score" DOUBLE PRECISION,
    "feedback" TEXT,

    CONSTRAINT "UserWritingSubmission_pkey" PRIMARY KEY ("idWritingSubmission")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

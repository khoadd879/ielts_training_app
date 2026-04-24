-- Create TeacherReviewTicket table
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create enum types
CREATE TYPE "ReviewType" AS ENUM ('WRITING', 'SPEAKING');
CREATE TYPE "TeacherReviewStatus" AS ENUM ('PENDING', 'CLAIMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

CREATE TABLE "TeacherReviewTicket" (
    "idTicket" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "idTestResult" TEXT NOT NULL,
    "idUser" TEXT NOT NULL,
    "type" "ReviewType" NOT NULL,
    "status" "TeacherReviewStatus" NOT NULL DEFAULT 'PENDING',
    "aiBandScore" DOUBLE PRECISION,
    "aiFeedback" JSONB,
    "idTeacher" TEXT,
    "claimedAt" TIMESTAMP(3),
    "teacherBandScore" DOUBLE PRECISION,
    "teacherFeedback" JSONB,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "commissionAmount" DOUBLE PRECISION,
    CONSTRAINT "TeacherReviewTicket_pkey" PRIMARY KEY ("idTicket")
);

-- Create indexes
CREATE INDEX "TeacherReviewTicket_status_createdAt_idx" ON "TeacherReviewTicket"("status", "createdAt");
CREATE INDEX "TeacherReviewTicket_idTeacher_status_idx" ON "TeacherReviewTicket"("idTeacher", "status");
CREATE INDEX "TeacherReviewTicket_idUser_status_idx" ON "TeacherReviewTicket"("idUser", "status");

-- Add foreign key for idTestResult
ALTER TABLE "TeacherReviewTicket" ADD CONSTRAINT "TeacherReviewTicket_idTestResult_fkey"
    FOREIGN KEY ("idTestResult") REFERENCES "UserTestResult"("idTestResult") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add foreign key for idTeacher
ALTER TABLE "TeacherReviewTicket" ADD CONSTRAINT "TeacherReviewTicket_idTeacher_fkey"
    FOREIGN KEY ("idTeacher") REFERENCES "User"("idUser") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add foreign key for idUser
ALTER TABLE "TeacherReviewTicket" ADD CONSTRAINT "TeacherReviewTicket_idUser_fkey"
    FOREIGN KEY ("idUser") REFERENCES "User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "public"."OTPType" AS ENUM ('OTP', 'RESET_LINK');

-- CreateTable
CREATE TABLE "public"."VerificationCode" (
    "idCode" TEXT NOT NULL,
    "idUser" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "type" "public"."OTPType" NOT NULL,
    "expiration" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationCode_pkey" PRIMARY KEY ("idCode")
);

-- AddForeignKey
ALTER TABLE "public"."VerificationCode" ADD CONSTRAINT "VerificationCode_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "public"."User"("idUser") ON DELETE RESTRICT ON UPDATE CASCADE;

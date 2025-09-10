import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { DatabaseService } from 'src/database/database.service';
import bcrypt from 'bcrypt';
import { OTPType } from '@prisma/client';

@Injectable()
export class VerificationService {
  // Implement OTP generation, storage, and verification logic here
  constructor(private readonly databaseService: DatabaseService) {}

  async generateOtp(userId: string, type: OTPType): Promise<string> {
    const otp = crypto.randomInt(100000, 999999).toString();
    const hashedOTP = await bcrypt.hash(otp, 10);
    const expiry = new Date(Date.now() + 2 * 60 * 1000); // OTP valid for 2 minutes
    const otpRecord = await this.databaseService.verificationCode.create({
      data: {
        idUser: userId,
        token: hashedOTP,
        type,
        expiration: expiry,
      },
    });
    return otp;
  }

  async getLatestOtp(userId: string) {
    return this.databaseService.verificationCode.findFirst({
      where: { idUser: userId, type: OTPType.OTP },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getLatestOtpResetPassword(userId: string) {
    return this.databaseService.verificationCode.findFirst({
      where: { idUser: userId, type: OTPType.RESET_LINK },
      orderBy: { createdAt: 'desc' },
    });
  }

  async compareOtp(otp: string, hashedOtp: string) {
    return bcrypt.compare(otp, hashedOtp);
  }

  async deleteAllOtp(id: string) {
    return this.databaseService.verificationCode.deleteMany({
      where: { idUser: id },
    });
  }
}

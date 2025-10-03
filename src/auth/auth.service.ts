import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../module/users/users.service';
import { comparePasswordHelper, hashPasswordHelper } from 'src/helpers/utils';
import { JwtService } from '@nestjs/jwt';
import { CreateAuthDto } from './dto/create-auth.dto';
import { VerificationService } from './verification/verification.service';
import { OTPType } from '@prisma/client';
import { CreateUserGoogleDto } from 'src/module/users/dto/create-user-google.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private readonly verificationService: VerificationService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);

    if (!user) return null;

    const isValidPassword = await comparePasswordHelper(pass, user.password);

    if (!isValidPassword) return null;

    return user;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.idUser };

    if (user.isActive === false) {
      throw new UnauthorizedException('Account is not activated');
    }

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRED,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRED,
    });

    return {
      message: 'Login successful',
      data: {
        user: {
          idUser: user.idUser,
          role: user.role,
        },
        access_token: accessToken,
        refresh_token: refreshToken,
      },
      status: 200,
    };
  }

  handleRegister = async (registerDto: CreateAuthDto) => {
    return await this.usersService.handleRegister(registerDto);
  };

  async verifyOtp(email: string, otp: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new BadRequestException('User not found');

    // Lấy OTP mới nhất của user
    const otpRecord = await this.verificationService.getLatestOtp(user.idUser);
    if (!otpRecord) throw new BadRequestException('OTP not found');

    // Kiểm tra hạn OTP
    if (otpRecord.expiration < new Date()) {
      throw new BadRequestException('OTP expired');
    }

    // So sánh OTP
    const isMatch = await this.verificationService.compareOtp(
      otp,
      otpRecord.token,
    );
    if (!isMatch) throw new BadRequestException('OTP incorrect');

    // Kích hoạt tài khoản
    await this.usersService.activateUser(user.idUser);

    return { message: 'Account activated successfully', status: 200 };
  }

  async resendOtp(email: string, type: OTPType) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new BadRequestException('User not found');

    let otpRecord;

    await this.verificationService.deleteAllOtp(user.idUser);

    if (type === OTPType.OTP && user.isActive) {
      throw new BadRequestException('Account is already activated');
    }

    if (type === OTPType.OTP && !user.isActive) {
      await this.verificationService.deleteAllOtp(user.idUser);
      otpRecord = await this.verificationService.generateOtp(user.idUser, type);
    }

    if (type === OTPType.RESET_LINK && user.isActive) {
      // Gửi mail cho user
      otpRecord = await this.verificationService.generateOtp(
        user.idUser,
        OTPType.RESET_LINK,
      );
    }
    return {
      message: 'OTP resent successfully',
      data: { otp: otpRecord },
      status: 200,
    };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new BadRequestException('User not found');
    await this.verificationService.deleteAllOtp(user.idUser);
    const otp = await this.verificationService.generateOtp(
      user.idUser,
      OTPType.RESET_LINK,
    );
    // Gửi mail cho user
    await this.usersService.sendResetPasswordMail(user.email, otp);
    return { message: 'OTP sent to email', data: otp, status: 200 };
  }

  async checkOTP(email: string, otp: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new BadRequestException('User not found');
    const otpRecord = await this.verificationService.getLatestOtpResetPassword(
      user.idUser,
    );
    if (!otpRecord) throw new BadRequestException('OTP not found');
    if (otpRecord.expiration < new Date())
      throw new BadRequestException('OTP expired');
    const isMatch = await this.verificationService.compareOtp(
      otp,
      otpRecord.token,
    );
    if (!isMatch) throw new BadRequestException('OTP incorrect');
    return { message: 'OTP is valid', status: 200 };
  }

  async resetPassword(
    email: string,
    newPassword: string,
    confirmPassword: string,
  ) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new BadRequestException('User not found');
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }
    // Chỉ update password
    const hashedPassword = await hashPasswordHelper(newPassword);
    await this.usersService.updatePassword(user.idUser, hashedPassword);
    // Xoá OTP sau khi dùng
    await this.verificationService.deleteAllOtp(user.idUser);
    return { message: 'Password reset successfully', status: 200 };
  }

  //introspect token
  async introspectToken(token: string) {
    const secrets = [process.env.JWT_SECRET, process.env.JWT_REFRESH_SECRET];

    for (const secret of secrets) {
      try {
        const decoded = this.jwtService.verify(token, { secret });
        return {
          message: 'Token is active',
          data: {
            active: true,
          },
          status: 200,
        };
      } catch (e) {
        // thử secret tiếp theo
      }
    }

    return {
      message: 'Token is inactive',
      data: { active: false },
      status: 200,
    };
  }

  async refreshTokens(refreshToken: string) {
    try {
      const decoded = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      const payload = { email: decoded.email, sub: decoded.sub };

      const newAccessToken = this.jwtService.sign(payload, {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRED,
      });

      return {
        message: 'Token refreshed',
        data: { access_token: newAccessToken },
        status: 200,
      };
    } catch (e) {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }
  }

  //validate google user
  async validateGoogleUser(googleUser: CreateUserGoogleDto) {
    const user = await this.usersService.findByEmail(googleUser.email);
    if (user) return user;
    return await this.usersService.createGoogleAccount(googleUser);
  }
}

import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { hashPasswordHelper } from 'src/helpers/utils';
import { CreateAuthDto } from 'src/auth/dto/create-auth.dto';
import { VerificationService } from 'src/auth/verification/verification.service';
import { OTPType } from '@prisma/client';
import { MailerService } from '@nestjs-modules/mailer';
@Injectable()
export class UsersService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly verificationService: VerificationService,
    private readonly mailerService: MailerService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const { nameUser, email, password, phoneNumber, address, avatar } =
      createUserDto;

    // Hash the password before storing it
    const hashedPassword = await hashPasswordHelper(password);

    const user = await this.databaseService.user.create({
      data: {
        nameUser,
        email,
        password: hashedPassword,
        phoneNumber,
        address,
        avatar,
      },
    });
    return {
      idUser: user.idUser,
      nameUser: user.nameUser,
      email: user.email,
      phoneNumber: user.phoneNumber,
      address: user.address,
      avatar: user.avatar,
    };
  }

  async findAll() {
    return this.databaseService.user.findMany();
  }

  async findOne(id: string) {
    return this.databaseService.user.findUnique({ where: { idUser: id } });
  }

  async findByEmail(email: string) {
    return await this.databaseService.user.findUnique({ where: { email } });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const { nameUser, email, phoneNumber, address, avatar } = updateUserDto;

    const user = await this.databaseService.user.update({
      where: { idUser: id },
      data: {
        nameUser,
        email,
        phoneNumber,
        address,
        avatar,
      },
    });
    return {
      idUser: user.idUser,
      nameUser: user.nameUser,
      email: user.email,
      phoneNumber: user.phoneNumber,
      address: user.address,
      avatar: user.avatar,
    };
  }

  async remove(id: string) {
    await this.verificationService.deleteAllOtp(id);

    return this.databaseService.user.delete({
      where: { idUser: id },
    });
  }

  async handleRegister(registerDto: CreateAuthDto) {
    const { email, password, confirmPassword } = registerDto;
    // Check if email already exists
    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      throw new BadRequestException('Email already in use');
    }

    if (password !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    //hash password
    const hashedPassword = await hashPasswordHelper(password);

    const user = await this.databaseService.user.create({
      data: {
        email,
        password: hashedPassword,
        isActive: false,
      },
    });
    const otpGenerate = await this.verificationService.generateOtp(
      user.idUser,
      OTPType.OTP,
    );

    this.mailerService.sendMail({
      to: `${user.email}`,
      subject: 'Mã Đăng Nhập',
      html: `
        <div style="background:#f5f5f5;padding:24px 0;">
          <div style="max-width:420px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;">
            <div style="background:#e5e5e5;padding:24px 0;text-align:center;">
              <h2 style="margin:0;font-size:28px;font-weight:600;">Mã Đăng Nhập</h2>
            </div>
            <div style="padding:32px 24px;text-align:center;">
              <p style="font-size:16px;">Đây là mã đăng nhập của bạn:</p>
              <div style="font-size:36px;letter-spacing:12px;font-weight:bold;margin:16px 0 8px 0;">
                ${otpGenerate}
              </div>
              <p style="color:#888;font-size:14px;">Mã này sẽ sớm hết hạn.</p>
            </div>
          </div>
        </div>
      `,
    });

    return { email, otpGenerate };
  }

  async activateUser(idUser: string) {
    return this.databaseService.user.update({
      where: { idUser },
      data: { isActive: true },
    });
  }

  async sendResetPasswordMail(email: string, otp: string) {
    await this.mailerService.sendMail({
      to: `${email}`,
      subject: 'Đặt lại mật khẩu',
      html: `
        <div style="background:#f5f5f5;padding:24px 0;">
          <div style="max-width:420px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;">
            <div style="background:#e5e5e5;padding:24px 0;text-align:center;">
              <h2 style="margin:0;font-size:28px;font-weight:600;">Đặt lại mật khẩu</h2>
            </div>
            <div style="padding:32px 24px;text-align:center;">
              <p style="font-size:16px;">Mã xác thực đặt lại mật khẩu của bạn:</p>
              <div style="font-size:36px;letter-spacing:12px;font-weight:bold;margin:16px 0 8px 0;">
                ${otp}
              </div>
              <p style="color:#888;font-size:14px;">Mã này sẽ sớm hết hạn.</p>
            </div>
          </div>
        </div>
      `,
    });

    return { email, otp };
  }

  async updatePassword(idUser: string, hashedPassword: string) {
    return this.databaseService.user.update({
      where: { idUser },
      data: { password: hashedPassword },
    });
  }
}

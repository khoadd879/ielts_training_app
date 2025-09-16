import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { hashPasswordHelper } from 'src/helpers/utils';
import { CreateAuthDto } from 'src/auth/dto/create-auth.dto';
import { VerificationService } from 'src/auth/verification/verification.service';
import { OTPType } from '@prisma/client';
import { MailerService } from '@nestjs-modules/mailer';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { CreateUserGoogleDto } from './dto/create-user-google.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly verificationService: VerificationService,
    private readonly mailerService: MailerService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const {
      nameUser,
      email,
      password,
      phoneNumber,
      address,
      avatar,
      role,
      accountType,
    } = createUserDto;

    const existingUser = await this.databaseService.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('Email already in use');
    }

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
        role,
        accountType,
      },
    });
    return {
      message: 'User created successfully',
      data: {
        idUser: user.idUser,
        nameUser: user.nameUser,
        email: user.email,
        phoneNumber: user.phoneNumber,
        address: user.address,
        role: user.role,
        accountType: user.accountType,
        avatar: user.avatar,
      },
      status: 200,
    };
  }

  async createGoogleAccount(createUserDto: CreateUserGoogleDto) {
    const {
      nameUser,
      email,
      password,
      phoneNumber,
      address,
      avatar,
      role,
      accountType,
      isActive,
    } = createUserDto;

    const existingUser = await this.databaseService.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('Email already in use');
    }

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
        role,
        accountType,
        isActive,
      },
    });
    return {
      message: 'User created successfully',
      data: {
        idUser: user.idUser,
        nameUser: user.nameUser,
        email: user.email,
        phoneNumber: user.phoneNumber,
        address: user.address,
        role: user.role,
        accountType: user.accountType,
        avatar: user.avatar,
      },
      status: 200,
    };
  }

  async findAll() {
    const users = await this.databaseService.user.findMany();
    // Loại bỏ password khỏi từng user
    const data = users.map(({ password, ...rest }) => rest);
    return { message: 'Users retrieved successfully', data, status: 200 };
  }

  async findOne(id: string) {
    const user = await this.databaseService.user.findUnique({
      where: { idUser: id },
    });
    if (!user) {
      return { message: 'User not found', data: null, status: 404 };
    }
    // Loại bỏ password
    const { password, ...data } = user;
    return { message: 'User retrieved successfully', data, status: 200 };
  }

  async findByEmail(email: string) {
    return await this.databaseService.user.findUnique({ where: { email } });
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    file?: Express.Multer.File,
  ) {
    const { nameUser, email, phoneNumber, address, accountType, role } =
      updateUserDto;
    let avatar = updateUserDto.avatar;

    // Nếu có file upload, upload lên Cloudinary và lấy link
    if (file) {
      const uploadResult = await this.cloudinaryService.uploadFile(file);
      avatar = uploadResult.secure_url;
    }

    const user = await this.databaseService.user.update({
      where: { idUser: id },
      data: {
        nameUser,
        email,
        phoneNumber,
        accountType,
        address,
        role,
        avatar,
      },
    });
    return {
      message: 'User updated successfully',
      data: {
        idUser: user.idUser,
        nameUser: user.nameUser,
        email: user.email,
        phoneNumber: user.phoneNumber,
        accountType: user.accountType,
        address: user.address,
        role: user.role,
        avatar: user.avatar,
      },
      status: 200,
    };
  }

  async remove(id: string) {
    await this.verificationService.deleteAllOtp(id);

    const data = await this.databaseService.user.delete({
      where: { idUser: id },
    });

    return { message: 'User deleted successfully', status: 200 };
  }

  async handleRegister(registerDto: CreateAuthDto) {
    const { email, password, confirmPassword } = registerDto;
    // Check if email already exists
    const existingUser = await this.findByEmail(email);

    if (existingUser && existingUser.isActive === true) {
      throw new BadRequestException('Email already in use');
    }

    if (password !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    // Nếu user đã tồn tại nhưng chưa kích hoạt, xóa user cũ và các OTP liên quan
    if (existingUser && existingUser.isActive === false) {
      await this.verificationService.deleteAllOtp(existingUser.idUser);
      await this.databaseService.user.delete({
        where: { idUser: existingUser.idUser },
      });
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

    return {
      message: 'User registered successfully',
      data: {
        idUser: user.idUser,
        otp: otpGenerate,
      },
      status: 200,
    };
  }

  async activateUser(idUser: string) {
    const data = await this.databaseService.user.update({
      where: { idUser },
      data: { isActive: true },
    });

    return { message: 'User activated successfully', data, status: 200 };
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

    return {
      message: 'Reset password email sent',
      data: {
        email: email,
        otp: otp,
      },
      status: 200,
    };
  }

  async updatePassword(idUser: string, hashedPassword: string) {
    const data = await this.databaseService.user.update({
      where: { idUser },
      data: { password: hashedPassword },
    });
    return { message: 'Password updated successfully', data, status: 200 };
  }

  // Xoá user không hoạt động trong một khoảng thời gian (theo ngày)
  async deleteInactiveUsersOlderThan(days: number) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const { count } = await this.databaseService.user.deleteMany({
      where: {
        isActive: false,
        createdAt: { lt: cutoff },
      },
    });
    return count;
  }
}

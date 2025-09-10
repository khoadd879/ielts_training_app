import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './passport/local-auth.guard';
import { Public } from 'src/decorator/customize';
import { CreateAuthDto } from './dto/create-auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @Public()
  login(@Request() req) {
    return this.authService.login(req.user);
  }

  @Post('register')
  @Public()
  register(@Body() registerDto: CreateAuthDto) {
    return this.authService.handleRegister(registerDto);
  }

  @Post('verify-otp')
  @Public()
  async verifyOtp(@Body() body: { email: string; otp: string }) {
    return this.authService.verifyOtp(body.email, body.otp);
  }

  @Post('resend-otp')
  @Public()
  async resendOtp(@Body() body: { email: string }) {
    return this.authService.resendOtp(body.email);
  }

  @Post('forgot-password')
  @Public()
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  @Public()
  async resetPassword(
    @Body()
    body: {
      email: string;
      otp: string;
      newPassword: string;
      confirmPassword: string;
    },
  ) {
    return this.authService.resetPassword(
      body.email,
      body.otp,
      body.newPassword,
      body.confirmPassword,
    );
  }
}

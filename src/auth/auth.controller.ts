import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './passport/local-auth.guard';
import { Public } from 'src/decorator/customize';
import { CreateAuthDto } from './dto/create-auth.dto';
import { LoginDto } from './dto/login.dto';
import { ApiBody } from '@nestjs/swagger';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDTO } from './dto/resend-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { GoogleAuthGuard } from './passport/google-auth/google-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiBody({ type: LoginDto })
  @Public()
  login(@Request() req) {
    return this.authService.login(req.user);
  }

  @Post('register')
  @Public()
  register(@Body() registerDto: CreateAuthDto) {
    return this.authService.handleRegister(registerDto);
  }

  @Post('verify-otp-register')
  @ApiBody({ type: VerifyOtpDto })
  @Public()
  async verifyOtp(@Body() body: { email: string; otp: string }) {
    return this.authService.verifyOtp(body.email, body.otp);
  }

  @Post('resend-otp')
  @ApiBody({ type: ResendOtpDTO })
  @Public()
  async resendOtp(@Body() body: { email: string; type: 'OTP' | 'RESET_LINK' }) {
    return this.authService.resendOtp(body.email, body.type);
  }

  @Post('forgot-password')
  @ApiBody({ type: ForgotPasswordDto })
  @Public()
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('checkotp-reset-password')
  @ApiBody({ type: VerifyOtpDto })
  @Public()
  async check_otp(
    @Body()
    body: {
      email: string;
      otp: string;
    },
  ) {
    return this.authService.checkOTP(body.email, body.otp);
  }

  @Post('reset-password')
  @ApiBody({ type: ResetPasswordDto })
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
      body.newPassword,
      body.confirmPassword,
    );
  }

  // introspect token
  @Post('introspect')
  @ApiBody({
    schema: { type: 'object', properties: { token: { type: 'string' } } },
  })
  @Public()
  async introspectToken(@Body() body: { token: string }) {
    return this.authService.introspectToken(body.token);
  }

  //login with google
  @Get('google/login')
  @Public()
  @UseGuards(GoogleAuthGuard)
  async googleLogin() {}

  //google callback

  @Get('google/callback')
  @Public()
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req, @Res() res) {
    const data = await this.authService.login(req.user);

    const token = data.data.access_token;
    const user = encodeURIComponent(JSON.stringify(data.data.user)); // 👈 encode

    return res.redirect(
      `http://localhost:3001/login?token=${token}&user=${user}`, // 👈 dùng & chứ không phải ?
    );
  }

  @Get('health')
  @Public()
  healthCheck() {
    return { status: 'ok' };
  }
}

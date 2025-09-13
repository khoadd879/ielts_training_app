import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
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

  @Post('verify-otp')
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
      body.otp,
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
}

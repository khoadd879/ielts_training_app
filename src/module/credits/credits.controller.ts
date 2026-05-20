import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from 'src/decorator/customize';
import { JwtAuthGuard } from 'src/auth/passport/jwt-auth.guard';
import { CreditsService } from './credits.service';
import { CreateCreditPackageDto } from './dto/create-credit-package.dto';
import { AdminAdjustDto } from './dto/admin-adjust.dto';

@ApiTags('credits')
@Controller('credits')
export class CreditsController {
  constructor(private readonly creditsService: CreditsService) {}

  // ===== User Routes =====

  @Get('balance')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getBalance(@Request() req: any) {
    const { userId } = req.user;
    return this.creditsService.getBalance(userId);
  }

  @Public()
  @Get('packages')
  async getPackages() {
    return this.creditsService.getActivePackages();
  }

  // NOTE: POST /credits/purchase removed — credits can only be granted
  // through a verified VNPay payment (POST /payment/vnpay/create).
  // Admins can still adjust balances via /credits/admin/adjust.

  // ===== Admin Routes =====

  @Post('packages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async createPackage(@Body() dto: CreateCreditPackageDto) {
    return this.creditsService.createPackage(dto);
  }

  @Post('admin/adjust')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async adjustBalance(@Body() dto: AdminAdjustDto) {
    return this.creditsService.adminAdjustBalance(
      dto.idUser,
      parseFloat(dto.amount),
      dto.reason,
    );
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/passport/jwt-auth.guard';
import { CreditsService } from './credits.service';
import { CreateCreditPackageDto } from './dto/create-credit-package.dto';
import { PurchaseCreditsDto } from './dto/purchase-credit.dto';

@Controller('credits')
@UseGuards(JwtAuthGuard)
export class CreditsController {
  constructor(private readonly creditsService: CreditsService) {}

  // ===== User Routes =====

  @Get('balance')
  async getBalance(@Request() req: any) {
    const { idUser } = req.user;
    return this.creditsService.getBalance(idUser);
  }

  @Get('packages')
  async getPackages() {
    return this.creditsService.getActivePackages();
  }

  @Post('purchase')
  async purchaseCredits(
    @Request() req: any,
    @Body() dto: PurchaseCreditsDto,
  ) {
    const { idUser } = req.user;
    return this.creditsService.purchaseCredits(idUser, dto);
  }

  // ===== Admin Routes =====

  @Post('packages')
  async createPackage(@Body() dto: CreateCreditPackageDto) {
    return this.creditsService.createPackage(dto);
  }

  @Post('admin/adjust')
  async adjustBalance(
    @Body() body: { idUser: string; amount: number; reason: string },
  ) {
    return this.creditsService.adminAdjustBalance(body.idUser, body.amount, body.reason);
  }
}
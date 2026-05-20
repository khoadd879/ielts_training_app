import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from 'src/decorator/customize';
import { JwtAuthGuard } from 'src/auth/passport/jwt-auth.guard';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import type { Response } from 'express';

@ApiTags('payment')
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * Create VNPay payment URL.
   * Returns JSON `{ paymentUrl, idTransaction, vnpTxnRef }` so the frontend
   * can navigate via `window.location.href` (avoids browser CORS preflight
   * that fetch/axios would trigger when chasing a 302 cross-origin).
   * POST /payment/vnpay/create
   */
  @Post('vnpay/create')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async createPayment(@Request() req: any, @Body() dto: CreatePaymentDto) {
    const { userId } = req.user;
    const forwarded = (req.headers['x-forwarded-for'] as string | undefined)
      ?.split(',')[0]
      ?.trim();
    const ipAddress = forwarded || req.ip || '0.0.0.0';

    return this.paymentService.createPaymentUrl({
      idUser: userId,
      idPackage: dto.idPackage,
      packageType: dto.packageType,
      ipAddress,
      bankCode: dto.bankCode,
    });
  }

  /**
   * VNPay return URL (browser redirected here after payment).
   * Display-only — actual provisioning happens in IPN.
   * GET /payment/vnpay/return
   */
  @Public()
  @Get('vnpay/return')
  async vnpayReturn(@Query() query: any, @Res() res: Response) {
    const result = await this.paymentService.handleVnpayReturn(query);
    const frontend = process.env.FRONTEND_URL || '';

    if (result.success) {
      return res.redirect(
        `${frontend}/payment/success?txnRef=${result.vnpTxnRef}&amount=${result.amount}`,
      );
    }
    return res.redirect(
      `${frontend}/payment/failed?message=${encodeURIComponent(
        result.message,
      )}`,
    );
  }

  /**
   * VNPay IPN (server-to-server, GET with query string per VNPay spec).
   * Returns plain JSON `{ RspCode, Message }` so VNPay knows the order is
   * confirmed (any non-200 or wrong field name triggers retry).
   * GET /payment/vnpay/ipn
   */
  @Public()
  @Get('vnpay/ipn')
  async vnpayIpn(@Query() query: Record<string, string>) {
    return this.paymentService.handleVnpayIpn(query);
  }
}
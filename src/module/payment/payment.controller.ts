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
   * VNPay return URL (customer redirected here after payment)
   * GET /payment/vnpay/return
   */
  @Public()
  @Get('vnpay/return')
  async vnpayReturn(@Query() query: any, @Res() res: Response) {
    const result = await this.paymentService.handleVnpayReturn(query);
    const frontend = process.env.FRONTEND_URL || '';

    if (result.success) {
      return res.redirect(
        `${frontend}/payment/success?txnRef=${result.txnRef}&amount=${result.amount}`,
      );
    } else {
      return res.redirect(
        `${frontend}/payment/failed?message=${encodeURIComponent(
          result.message,
        )}`,
      );
    }
  }

  /**
   * VNPay IPN URL (server-to-server notification)
   * POST /payment/vnpay/ipn
   */
  @Public()
  @Post('vnpay/ipn')
  async vnpayIpn(@Body() body: any, @Res() res: Response) {
    const result = await this.paymentService.handleVnpayIpn(body);
    return res.json(result);
  }
}
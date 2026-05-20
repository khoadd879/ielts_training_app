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
   * Create VNPay payment URL and redirect user
   * POST /payment/vnpay/create
   */
  @Post('vnpay/create')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async createPayment(
    @Request() req: any,
    @Body() dto: CreatePaymentDto,
    @Res() res: Response,
  ) {
    const { userId } = req.user;
    const forwarded = (req.headers['x-forwarded-for'] as string | undefined)
      ?.split(',')[0]
      ?.trim();
    const ipAddress = forwarded || req.ip || '0.0.0.0';

    // Get package details to determine amount
    // TODO: Call CreditsService or SubscriptionService to get price

    const { paymentUrl, txnRef } = await this.paymentService.createPaymentUrl({
      idUser: userId,
      idPackage: dto.idPackage,
      packageType: dto.packageType,
      amount: 50000, // TODO: Get from package price
      orderInfo: 'Purchase AI Grading Credits',
      ipAddress,
      bankCode: dto.bankCode,
    });

    // Store txnRef in session or cache for verification on return
    // For now, redirect directly
    return res.redirect(paymentUrl);
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
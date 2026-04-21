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
import { JwtAuthGuard } from 'src/auth/passport/jwt-auth.guard';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Response } from 'express';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * Create VNPay payment URL and redirect user
   * POST /payment/vnpay/create
   */
  @Post('vnpay/create')
  @UseGuards(JwtAuthGuard)
  async createPayment(
    @Request() req: any,
    @Body() dto: CreatePaymentDto,
    @Res() res: Response,
  ) {
    const { idUser } = req.user;
    const ipAddress = dto.ipAddress || req.ip;

    // Get package details to determine amount
    // TODO: Call CreditsService or SubscriptionService to get price

    const { paymentUrl, txnRef } = await this.paymentService.createPaymentUrl({
      idUser,
      idPackage: dto.idPackage,
      packageType: dto.packageType,
      amount: 50000, // TODO: Get from package price
      orderInfo: 'Purchase AI Grading Credits',
      ipAddress,
    });

    // Store txnRef in session or cache for verification on return
    // For now, redirect directly
    return res.redirect(paymentUrl);
  }

  /**
   * VNPay return URL (customer redirected here after payment)
   * GET /payment/vnpay/return
   */
  @Get('vnpay/return')
  async vnpayReturn(@Query() query: any, @Res() res: Response) {
    const result = await this.paymentService.handleVnpayReturn(query);

    if (result.success) {
      // Redirect to success page with query params
      return res.redirect(
        `/payment/success?txnRef=${result.txnRef}&amount=${result.amount}`,
      );
    } else {
      // Redirect to failure page
      return res.redirect(
        `/payment/failed?message=${encodeURIComponent(result.message)}`,
      );
    }
  }

  /**
   * VNPay IPN URL (server-to-server notification)
   * POST /payment/vnpay/ipn
   */
  @Post('vnpay/ipn')
  async vnpayIpn(@Body() body: any, @Res() res: Response) {
    const result = await this.paymentService.handleVnpayIpn(body);
    return res.json(result);
  }
}
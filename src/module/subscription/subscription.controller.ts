import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  UseGuards,
  Request,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from 'src/decorator/customize';
import { JwtAuthGuard } from 'src/auth/passport/jwt-auth.guard';
import { SubscriptionService } from './subscription.service';
import { CreateSubscriptionPackageDto } from './dto/create-subscription-package.dto';
import { SubscribeDto } from './dto/subscribe.dto';
import { PaymentService } from '../payment/payment.service';

@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    @Inject(forwardRef(() => PaymentService))
    private readonly paymentService: PaymentService,
  ) {}

  // ===== User Routes =====

  @Get('current')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getCurrentSubscription(@Request() req: any) {
    const { userId } = req.user;
    return this.subscriptionService.getUserSubscription(userId);
  }

  @Public()
  @Get('packages')
  async getPackages() {
    return this.subscriptionService.getActivePackages();
  }

  /**
   * Subscribe routes through VNPay payment.
   * Returns JSON `{ paymentUrl, idTransaction, vnpTxnRef }` — the actual
   * subscription is activated only after VNPay's IPN confirms payment.
   */
  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async subscribe(@Request() req: any, @Body() dto: SubscribeDto) {
    const { userId } = req.user;
    const forwarded = (req.headers['x-forwarded-for'] as string | undefined)
      ?.split(',')[0]
      ?.trim();
    const ipAddress = forwarded || req.ip || '0.0.0.0';

    return this.paymentService.createPaymentUrl({
      idUser: userId,
      idPackage: dto.idPackage,
      packageType: 'SUBSCRIPTION',
      ipAddress,
      bankCode: dto.bankCode,
    });
  }

  @Put('cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async cancel(@Request() req: any) {
    const { userId } = req.user;
    return this.subscriptionService.cancelSubscription(userId);
  }

  // ===== Admin Routes =====

  @Post('packages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async createPackage(@Body() dto: CreateSubscriptionPackageDto) {
    return this.subscriptionService.createPackage(dto);
  }

  @Post('admin/grant')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async adminGrantSubscription(
    @Body() body: { idUser: string; idPackage: string; durationDays: number },
  ) {
    return this.subscriptionService.adminCreateSubscription(
      body.idUser,
      body.idPackage,
      body.durationDays,
    );
  }
}

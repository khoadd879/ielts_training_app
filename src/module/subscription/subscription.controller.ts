import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Inject,
  forwardRef,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
} from '@nestjs/swagger';
import { Public } from 'src/decorator/customize';
import { JwtAuthGuard } from 'src/auth/passport/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { SubscriptionService } from './subscription.service';
import { CreateSubscriptionPackageDto } from './dto/create-subscription-package.dto';
import { UpdateSubscriptionPackageDto } from './dto/update-subscription-package.dto';
import { SubscribeDto } from './dto/subscribe.dto';
import { PaymentService } from '../payment/payment.service';
import { CreatePaymentResponseDto } from '../payment/dto/create-payment-response.dto';

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
  @ApiOperation({
    summary: 'Subscribe (routes through VNPay)',
    description:
      'Returns a VNPay payment URL — the actual subscription is activated only after VNPay\'s IPN callback confirms payment. Frontend should navigate via `window.location.href = paymentUrl`.',
  })
  @ApiOkResponse({ type: CreatePaymentResponseDto })
  async subscribe(
    @Request() req: any,
    @Body() dto: SubscribeDto,
  ): Promise<CreatePaymentResponseDto> {
    const { userId } = req.user;
    const forwarded = (req.headers['x-forwarded-for'] as string | undefined)
      ?.split(',')[0]
      ?.trim();
    const rawIp = forwarded || req.ip || '127.0.0.1';
    const ipAddress =
      rawIp.startsWith('::ffff:') ? rawIp.slice(7) : rawIp.includes(':') ? '127.0.0.1' : rawIp;

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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  async createPackage(@Body() dto: CreateSubscriptionPackageDto) {
    return this.subscriptionService.createPackage(dto);
  }

  // ===== Admin: List All Packages (incl. inactive) =====

  @Get('admin/packages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  async listAllPackages() {
    return this.subscriptionService.getAllPackagesAdmin();
  }

  // ===== Admin: Update Package =====

  @Put('admin/packages/:idPackage')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  async updatePackage(
    @Param('idPackage') idPackage: string,
    @Body() dto: UpdateSubscriptionPackageDto,
  ) {
    return this.subscriptionService.updatePackage(idPackage, dto);
  }

  // ===== Admin: Toggle Active =====

  @Patch('admin/packages/:idPackage/active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  async toggleActive(
    @Param('idPackage') idPackage: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.subscriptionService.setPackageActive(idPackage, !!isActive);
  }

  // ===== Admin: Soft Delete (set isActive=false) =====

  @Delete('admin/packages/:idPackage')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  async deletePackage(@Param('idPackage') idPackage: string) {
    return this.subscriptionService.setPackageActive(idPackage, false);
  }

  @Post('admin/grant')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
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

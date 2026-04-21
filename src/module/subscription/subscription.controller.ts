import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/passport/jwt-auth.guard';
import { SubscriptionService } from './subscription.service';
import { CreateSubscriptionPackageDto } from './dto/create-subscription-package.dto';
import { SubscribeDto } from './dto/subscribe.dto';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  // ===== User Routes =====

  @Get('current')
  async getCurrentSubscription(@Request() req: any) {
    const { idUser } = req.user;
    return this.subscriptionService.getUserSubscription(idUser);
  }

  @Get('packages')
  async getPackages() {
    return this.subscriptionService.getActivePackages();
  }

  @Post('subscribe')
  async subscribe(
    @Request() req: any,
    @Body() dto: SubscribeDto,
  ) {
    const { idUser } = req.user;
    return this.subscriptionService.subscribe(idUser, dto);
  }

  @Put('cancel')
  async cancel(@Request() req: any) {
    const { idUser } = req.user;
    return this.subscriptionService.cancelSubscription(idUser);
  }

  // ===== Admin Routes =====

  @Post('packages')
  async createPackage(@Body() dto: CreateSubscriptionPackageDto) {
    return this.subscriptionService.createPackage(dto);
  }

  @Post('admin/grant')
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
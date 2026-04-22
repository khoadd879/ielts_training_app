import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from 'src/decorator/customize';
import { JwtAuthGuard } from 'src/auth/passport/jwt-auth.guard';
import { SubscriptionService } from './subscription.service';
import { CreateSubscriptionPackageDto } from './dto/create-subscription-package.dto';
import { SubscribeDto } from './dto/subscribe.dto';

@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

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

  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async subscribe(
    @Request() req: any,
    @Body() dto: SubscribeDto,
  ) {
    const { userId } = req.user;
    return this.subscriptionService.subscribe(userId, dto);
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
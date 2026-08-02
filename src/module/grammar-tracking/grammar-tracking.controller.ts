import { Controller, Get, Param, Query } from '@nestjs/common';
import { GrammarTrackingService } from './grammar-tracking.service';

@Controller('grammar')
export class GrammarTrackingController {
  constructor(private readonly service: GrammarTrackingService) {}

  @Get('violations/:userId')
  async getViolations(
    @Param('userId') userId: string,
    @Query('limit') limit?: number,
  ) {
    return this.service.getViolationsByUser(userId, limit ? Number(limit) : 20);
  }

  @Get('weak/:userId')
  async getWeakAreas(@Param('userId') userId: string) {
    return this.service.getWeakAreas(userId);
  }
}

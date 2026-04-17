import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get teacher dashboard overview statistics' })
  getOverviewStats() {
    return this.dashboardService.getOverviewStats();
  }

  @Get('top-performers')
  @ApiOperation({ summary: 'Get top 5 students by average band score' })
  getTopPerformers() {
    return this.dashboardService.getTopPerformers();
  }

  @Get('top-streaks')
  @ApiOperation({ summary: 'Get top 5 students by current streak' })
  getTopStreaks() {
    return this.dashboardService.getTopStreaks();
  }

  @Get('skills')
  @ApiOperation({ summary: 'Get skill performance averages by test type' })
  getSkillPerformance() {
    return this.dashboardService.getSkillPerformance();
  }
}

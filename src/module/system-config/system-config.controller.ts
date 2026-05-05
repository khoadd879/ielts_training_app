import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { SystemConfigService } from './system-config.service';
import { JwtAuthGuard } from 'src/auth/passport/jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AssignMode } from '@prisma/client';

interface CommissionDto {
  writing: number;
  speaking: number;
}

interface AssignModeDto {
  mode: 'AUTO' | 'MANUAL';
}

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('system-config')
export class SystemConfigController {
  constructor(private readonly systemConfigService: SystemConfigService) {}

  @Get(':key')
  async getConfig(@Param('key') key: string) {
    const value = await this.systemConfigService.getConfig(key);
    return { key, value };
  }

  @Put(':key')
  async setConfig(@Param('key') key: string, @Body() value: any) {
    await this.systemConfigService.setConfig(key, value);
    return { message: 'Config updated successfully' };
  }

  // Specific endpoints for teacher review
  @Get('teacher-review/commission')
  async getCommission() {
    const commission = await this.systemConfigService.getCommission();
    return commission;
  }

  @Put('teacher-review/commission')
  async setCommission(@Body() body: CommissionDto) {
    await this.systemConfigService.setCommission(body);
    return { message: 'Commission updated successfully', data: body };
  }

  @Get('teacher-review/assign-mode')
  async getAssignMode() {
    const mode = await this.systemConfigService.getAssignMode();
    return { mode };
  }

  @Put('teacher-review/assign-mode')
  async setAssignMode(@Body() body: AssignModeDto) {
    // Validate enum values before passing to service
    if (body.mode !== 'AUTO' && body.mode !== 'MANUAL') {
      throw new BadRequestException(
        `Invalid assign mode: ${body.mode}. Allowed values: AUTO, MANUAL`,
      );
    }
    
    await this.systemConfigService.setAssignMode(body.mode as AssignMode);
    return { message: 'Assign mode updated successfully', mode: body.mode };
  }
}

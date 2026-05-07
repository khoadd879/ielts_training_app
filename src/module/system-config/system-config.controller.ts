import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  UseGuards,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { SystemConfigService } from './system-config.service';
import { JwtAuthGuard } from 'src/auth/passport/jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AssignMode, Role } from '@prisma/client';
import { CommissionDto } from './dto/commission.dto';
import { AssignModeDto } from './dto/assign-mode.dto';
import { ModerationPolicyDto } from './dto/moderation-policy.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Controller('system-config')
export class SystemConfigController {
  constructor(private readonly systemConfigService: SystemConfigService) {}

  private getRequestUserId(req: { user?: { userId?: string; nameUser?: string; role?: Role } }): string {
    return req?.user?.userId || 'SYSTEM';
  }

  private getRequestUserName(req: { user?: { userId?: string; nameUser?: string; role?: Role } }): string {
    return req?.user?.nameUser || 'System';
  }

  private getRequestUserRole(req: { user?: { userId?: string; nameUser?: string; role?: Role } }): Role {
    return req?.user?.role || Role.ADMIN;
  }

  @Get(':key')
  @Roles(Role.ADMIN)
  async getConfig(@Param('key') key: string) {
    const value = await this.systemConfigService.getConfig(key);
    return { key, value };
  }

  @Put(':key')
  @Roles(Role.ADMIN)
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
  @Roles(Role.ADMIN)
  async setCommission(@Body() body: CommissionDto, @Req() req: any) {
    await this.systemConfigService.setCommission(
      body,
      this.getRequestUserId(req),
      this.getRequestUserName(req),
      this.getRequestUserRole(req),
    );
    return { message: 'Commission updated successfully', data: body };
  }

  @Get('teacher-review/assign-mode')
  async getAssignMode() {
    const mode = await this.systemConfigService.getAssignMode();
    return { mode };
  }

  @Put('teacher-review/assign-mode')
  @Roles(Role.ADMIN)
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

  @Get('moderation/policy')
  async getModerationPolicy() {
    const policy = await this.systemConfigService.getModerationPolicy();
    return policy;
  }

  @Put('moderation/policy')
  @Roles(Role.ADMIN)
  async setModerationPolicy(@Body() body: ModerationPolicyDto, @Req() req: any) {
    await this.systemConfigService.setModerationPolicy(
      body,
      this.getRequestUserId(req),
      this.getRequestUserName(req),
      this.getRequestUserRole(req),
    );
    return { message: 'Moderation policy updated successfully' };
  }
}

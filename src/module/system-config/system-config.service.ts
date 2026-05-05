import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { AssignMode } from '@prisma/client';

@Injectable()
export class SystemConfigService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getConfig(key: string): Promise<any> {
    const config = await this.databaseService.systemConfig.findUnique({
      where: { idConfig: key },
    });
    return config?.value;
  }

  async setConfig(key: string, value: any): Promise<void> {
    await this.databaseService.systemConfig.upsert({
      where: { idConfig: key },
      update: { value },
      create: { idConfig: key, value },
    });
  }

  async getCommission(): Promise<{ writing: number; speaking: number }> {
    const value = await this.getConfig('teacher_review_commission');
    return (
      value || {
        writing: 50000,
        speaking: 40000,
      }
    );
  }

  async setCommission(
    commission: { writing: number; speaking: number },
  ): Promise<void> {
    await this.setConfig('teacher_review_commission', commission);
  }

  async getAssignMode(): Promise<AssignMode> {
    const config = await this.databaseService.systemConfig.findUnique({
      where: { idConfig: 'assign_mode' },
    });
    
    if (!config || !config.assignMode) {
      return AssignMode.MANUAL;
    }
    
    return config.assignMode;
  }

  async setAssignMode(mode: AssignMode): Promise<void> {
    // Validate enum - only AUTO or MANUAL allowed
    if (mode !== AssignMode.AUTO && mode !== AssignMode.MANUAL) {
      throw new BadRequestException(
        `Invalid assign mode: ${mode}. Allowed values: AUTO, MANUAL`,
      );
    }

    // Update using upsert with assignMode enum field
    await this.databaseService.systemConfig.upsert({
      where: { idConfig: 'assign_mode' },
      update: { assignMode: mode },
      create: {
        idConfig: 'assign_mode',
        value: {},
        assignMode: mode
      },
    });
  }
}

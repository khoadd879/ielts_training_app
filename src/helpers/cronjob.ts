import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UsersService } from '../module/users/users.service';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class DeleteInactiveUsersTask {
  private readonly logger = new Logger(DeleteInactiveUsersTask.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly databaseService: DatabaseService,
  ) {}

  // Chạy mỗi ngày lúc 2h sáng
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleCron() {
    const deleted = await this.usersService.deleteInactiveUsersOlderThan(1); // 1 ngày
    this.logger.log(`Deleted ${deleted} inactive users`);
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanOldTestResults() {
    const expiredTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const expiredResults = await this.databaseService.userTestResult.findMany({
      where: { updatedAt: { lt: expiredTime } },
    });

    for (const result of expiredResults) {
      await this.databaseService.userAnswer.deleteMany({
        where: { idTestResult: result.idTestResult },
      });
      await this.databaseService.userTestResult.delete({
        where: { idTestResult: result.idTestResult },
      });
    }
  }
}

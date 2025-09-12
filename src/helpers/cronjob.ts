import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UsersService } from '../module/users/users.service';

@Injectable()
export class DeleteInactiveUsersTask {
  private readonly logger = new Logger(DeleteInactiveUsersTask.name);

  constructor(private readonly usersService: UsersService) {}

  // Chạy mỗi ngày lúc 2h sáng
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleCron() {
    const deleted = await this.usersService.deleteInactiveUsersOlderThan(1); // 1 ngày
    this.logger.log(`Deleted ${deleted} inactive users`);
  }
}

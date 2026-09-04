import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UsersService } from '../module/users/users.service';
import { DatabaseService } from 'src/database/database.service';
import { TestStatus } from '@prisma/client';

const HOURS_24_MS = 24 * 60 * 60 * 1000;

interface RetentionPolicy {
  cutoff: Date;
  protectedStatuses: TestStatus[];
}

@Injectable()
export class DeleteInactiveUsersTask {
  private readonly logger = new Logger(DeleteInactiveUsersTask.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly databaseService: DatabaseService,
  ) {}

  // Chạy mỗi ngày lúc 2h sáng
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleCron(): Promise<void> {
    const deleted = await this.usersService.deleteInactiveUsersOlderThan(1); // 1 ngày
    this.logger.log(`Deleted ${deleted} inactive users`);
  }

  /**
   * BE-1 retention policy:
   *   - Only delete `UserTestResult` rows with status `IN_PROGRESS`
   *     AND `createdAt < now - 24h`.
   *   - Rows with status `FINISHED`, `EXPIRED`, or `CANCELLED` are
   *     preserved regardless of age.
   *   - Child `UserAnswer` rows are removed first inside a transaction
   *     using `IN`-filter so we stay under 2 round trips.
   *   - All errors bubble up to the scheduler; deletion is irreversible
   *     and must not be silently swallowed.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanOldTestResults(): Promise<void> {
    const policy: RetentionPolicy = {
      cutoff: new Date(Date.now() - HOURS_24_MS),
      protectedStatuses: [
        TestStatus.FINISHED,
        TestStatus.EXPIRED,
        TestStatus.CANCELLED,
      ],
    };

    this.logger.log(
      `cleanOldTestResults: policy=IN_PROGRESS_AND_OLDER_THAN_24H ` +
        `cutoff=${policy.cutoff.toISOString()} ` +
        `protected=${policy.protectedStatuses.join(',')}`,
    );

    // Single SELECT to know how many rows are eligible. The actual delete
    // is performed by the two `deleteMany` calls below — we never trust
    // the SELECT count as the source of truth.
    const eligible = await this.databaseService.userTestResult.findMany({
      where: {
        status: TestStatus.IN_PROGRESS,
        createdAt: { lt: policy.cutoff },
      },
      select: { idTestResult: true },
    });

    if (eligible.length === 0) {
      this.logger.log('cleanOldTestResults: no expired IN_PROGRESS rows');
      return;
    }

    const ids = eligible.map((row) => row.idTestResult);

    const result = await this.databaseService.$transaction(async (tx) => {
      const answers = await tx.userAnswer.deleteMany({
        where: { idTestResult: { in: ids } },
      });
      const results = await tx.userTestResult.deleteMany({
        where: {
          idTestResult: { in: ids },
          status: TestStatus.IN_PROGRESS,
          createdAt: { lt: policy.cutoff },
        },
      });
      return { answers: answers.count, results: results.count };
    });

    this.logger.log(
      `cleanOldTestResults: deleted results=${result.results} ` +
        `answers=${result.answers} ` +
        `eligibleBefore=${eligible.length}`,
    );
  }
}

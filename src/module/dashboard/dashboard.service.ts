import {
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Role, TeacherReviewStatus, TestStatus, TestType } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';

type SkillType = 'LISTENING' | 'READING' | 'WRITING' | 'SPEAKING';

interface SkillAccumulator {
  total: number;
  count: number;
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly prisma: DatabaseService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private async resolveDashboardRoles(): Promise<Role[]> {
    const totalStudents = await this.prisma.user.count({
      where: { role: Role.USER },
    });

    // In development databases where no USER accounts exist yet,
    // fallback to teacher data so dashboard does not stay empty.
    if (totalStudents === 0) {
      return [Role.GIAOVIEN];
    }

    return [Role.USER];
  }

  async getOverviewStats() {
    try {
      const roles = await this.resolveDashboardRoles();
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfNextMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        1,
      );
      const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );
      const sevenDaysAgo = new Date(
        now.getTime() - 7 * 24 * 60 * 60 * 1000,
      );
      const fourteenDaysAgo = new Date(
        now.getTime() - 14 * 24 * 60 * 60 * 1000,
      );

      const [
        totalStudents,
        testsThisMonth,
        avgBandScoreResult,
        reviewsThisWeek,
        reviewsLastWeek,
        reviewsToday,
      ] = await Promise.all([
        this.prisma.user.count({
          where: {
            role: {
              in: roles,
            },
          },
        }),
        this.prisma.userTestResult.count({
          where: {
            status: TestStatus.FINISHED,
            finishedAt: {
              gte: startOfMonth,
              lt: startOfNextMonth,
            },
            user: {
              is: {
                role: {
                  in: roles,
                },
              },
            },
          },
        }),
        this.prisma.userTestResult.aggregate({
          where: {
            status: TestStatus.FINISHED,
            user: {
              is: {
                role: {
                  in: roles,
                },
              },
            },
          },
          _avg: {
            bandScore: true,
          },
        }),
        // Reviews graded in the last 7 days
        this.prisma.teacherReviewTicket.count({
          where: {
            status: TeacherReviewStatus.COMPLETED,
            updatedAt: { gte: sevenDaysAgo },
          },
        }),
        // Reviews graded in the previous 7-day window (for delta%)
        this.prisma.teacherReviewTicket.count({
          where: {
            status: TeacherReviewStatus.COMPLETED,
            updatedAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
          },
        }),
        // Reviews graded since midnight today
        this.prisma.teacherReviewTicket.count({
          where: {
            status: TeacherReviewStatus.COMPLETED,
            updatedAt: { gte: startOfDay },
          },
        }),
      ]);

      return {
        totalStudents,
        testsThisMonth,
        avgBandScore: this.normalizeBandScore(avgBandScoreResult._avg.bandScore),
        reviewsThisWeek,
        reviewsLastWeek,
        reviewsToday,
      };
    } catch (error) {
      this.handleError(error, 'load overview stats');
    }
  }

  async getTopPerformers() {
    try {
      const roles = await this.resolveDashboardRoles();
      const groupedResults = await this.prisma.userTestResult.groupBy({
        by: ['idUser'],
        where: {
          status: TestStatus.FINISHED,
          user: {
            is: {
              role: {
                in: roles,
              },
            },
          },
        },
        _avg: {
          bandScore: true,
        },
        _count: {
          _all: true,
        },
        orderBy: {
          _avg: {
            bandScore: 'desc',
          },
        },
        take: 5,
      });

      const userIds = groupedResults.map((item) => item.idUser);
      if (!userIds.length) {
        return [];
      }

      const users = await this.prisma.user.findMany({
        where: {
          idUser: { in: userIds },
          role: {
            in: roles,
          },
        },
        select: {
          idUser: true,
          nameUser: true,
          avatar: true,
        },
      });

      const userMap = new Map(users.map((user) => [user.idUser, user]));

      return groupedResults
        .map((item) => {
          const user = userMap.get(item.idUser);
          if (!user) {
            return null;
          }

          return {
            idUser: user.idUser,
            nameUser: user.nameUser,
            avatar: user.avatar,
            averageBandScore: this.normalizeBandScore(item._avg.bandScore),
            totalTestsTaken: item._count._all,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);
    } catch (error) {
      this.handleError(error, 'load top performers');
    }
  }

  async getTopStreaks() {
    try {
      const roles = await this.resolveDashboardRoles();
      return await this.prisma.user.findMany({
        where: {
          role: {
            in: roles,
          },
        },
        select: {
          idUser: true,
          nameUser: true,
          avatar: true,
          currentStreak: true,
        },
        orderBy: [
          {
            currentStreak: 'desc',
          },
          {
            updatedAt: 'desc',
          },
        ],
        take: 5,
      });
    } catch (error) {
      this.handleError(error, 'load top streaks');
    }
  }

  async getSkillPerformance() {
    try {
      const roles = await this.resolveDashboardRoles();
      const cacheKey = `dashboard:skill-performance:all`;
      const cached = await this.cacheManager.get<Record<SkillType, SkillAccumulator>>(cacheKey);
      if (cached) return cached;

      const rows = await this.prisma.$queryRaw<
        Array<{ testType: string; avg: number | null; count: bigint }>
      >`
      SELECT t."testType" AS "testType",
             AVG(r."bandScore")::float AS "avg",
             COUNT(r."idTestResult") AS "count"
        FROM "UserTestResult" r
        JOIN "Test" t ON t."idTest" = r."idTest"
       WHERE r."status" = 'FINISHED'::"TestStatus"
         AND r."bandScore" > 0
         AND r."idUser" IN (
           SELECT "idUser" FROM "User" WHERE "role" = ANY(${roles}::"Role"[])
         )
       GROUP BY t."testType"
    `;

      const skillAccumulator: Record<SkillType, SkillAccumulator> = {
        LISTENING: { total: 0, count: 0 },
        READING: { total: 0, count: 0 },
        WRITING: { total: 0, count: 0 },
        SPEAKING: { total: 0, count: 0 },
      };

      for (const row of rows) {
        const type = row.testType as SkillType;
        if (skillAccumulator[type]) {
          skillAccumulator[type].total = row.avg ?? 0;
          skillAccumulator[type].count = Number(row.count);
        }
      }

      await this.cacheManager.set(cacheKey, skillAccumulator, 60);
      return skillAccumulator;
    } catch (error) {
      this.logger.error('getSkillPerformance failed:', error);
      throw error;
    }
  }

  private calculateSkillAverage(skill: SkillAccumulator): number {
    if (!skill.count) {
      return 0;
    }

    return this.normalizeBandScore(skill.total / skill.count);
  }

  private normalizeBandScore(score?: number | null): number {
    if (score == null) {
      return 0;
    }

    return Number(score.toFixed(2));
  }

  private handleError(error: unknown, operation: string): never {
    if (error instanceof HttpException) {
      throw error;
    }

    this.logger.error(`Failed to ${operation}`, error as any);
    throw new InternalServerErrorException(
      `An error occurred while trying to ${operation}`,
    );
  }
}

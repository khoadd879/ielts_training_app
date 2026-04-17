import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Role, TestStatus, TestType } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';

type SkillType = 'LISTENING' | 'READING' | 'WRITING' | 'SPEAKING';

interface SkillAccumulator {
  total: number;
  count: number;
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly prisma: DatabaseService) {}

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

      const [totalStudents, testsThisMonth, avgBandScoreResult] =
        await Promise.all([
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
        ]);

      return {
        totalStudents,
        testsThisMonth,
        avgBandScore: this.normalizeBandScore(avgBandScoreResult._avg.bandScore),
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
      const finishedResults = await this.prisma.userTestResult.findMany({
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
        select: {
          bandScore: true,
          test: {
            select: {
              testType: true,
            },
          },
        },
      });

      const skillAccumulator: Record<SkillType, SkillAccumulator> = {
        LISTENING: { total: 0, count: 0 },
        READING: { total: 0, count: 0 },
        WRITING: { total: 0, count: 0 },
        SPEAKING: { total: 0, count: 0 },
      };

      finishedResults.forEach((result) => {
        const type = result.test.testType as SkillType;
        skillAccumulator[type].total += result.bandScore;
        skillAccumulator[type].count += 1;
      });

      return {
        LISTENING: this.calculateSkillAverage(skillAccumulator.LISTENING),
        READING: this.calculateSkillAverage(skillAccumulator.READING),
        WRITING: this.calculateSkillAverage(skillAccumulator.WRITING),
        SPEAKING: this.calculateSkillAverage(skillAccumulator.SPEAKING),
      } as Record<TestType, number>;
    } catch (error) {
      this.handleError(error, 'load skill performance');
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

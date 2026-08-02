import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { differenceInDays, format } from 'date-fns';
import { DatabaseService } from 'src/database/database.service';
import { CreateTargetExam } from './dto/create-target-exam.dto';
import { TestType } from '@prisma/client';

@Injectable()
export class StatisticsService {
  constructor(
    private readonly prisma: DatabaseService,
    @Inject(CACHE_MANAGER) private cache: Cache,
  ) {}

  async OverAllScore(idUser: string) {
    const cacheKey = `statistics:overall:${idUser}`;
    const cached = await this.cache.get<{
      READING: number; LISTENING: number; WRITING: number; SPEAKING: number; total: number;
    }>(cacheKey);
    if (cached) return cached;

    const rows = await this.prisma.$queryRaw<
      Array<{ testType: string; avg: number | null }>
    >`
    SELECT t."testType" AS "testType", AVG(r."bandScore")::float AS "avg"
      FROM "UserTestResult" r
      JOIN "Test" t ON t."idTest" = r."idTest"
     WHERE r."idUser" = ${idUser}::uuid
       AND r."status" = 'FINISHED'::"TestStatus"
       AND r."bandScore" > 0
     GROUP BY t."testType"
  `;

    const roundToIeltsScore = (score: number): number =>
      Math.round(score * 2) / 2;

    const result = {
      READING: 0,
      LISTENING: 0,
      WRITING: 0,
      SPEAKING: 0,
      total: 0,
    };

    for (const row of rows) {
      const score = row.avg ? roundToIeltsScore(row.avg) : 0;
      if (row.testType in result) {
        result[row.testType as keyof typeof result] = score;
      }
    }

    result.total =
      roundToIeltsScore(result.READING + result.LISTENING + result.WRITING + result.SPEAKING);

    await this.cache.set(cacheKey, result, 60);
    return result;
  }

  async statistic(idUser: string) {
    const cacheKey = `statistics:daily:${idUser}`;
    const cached = await this.cache.get<any[]>(cacheKey);
    if (cached) return cached;

    const rows = await this.prisma.$queryRaw<
      Array<{ day: Date; testType: string; avg: number | null; count: bigint }>
    >`
    SELECT date_trunc('day', r."createdAt") AS day,
           t."testType" AS "testType",
           AVG(r."bandScore")::float AS "avg",
           COUNT(r."idTestResult") AS "count"
      FROM "UserTestResult" r
      JOIN "Test" t ON t."idTest" = r."idTest"
     WHERE r."idUser" = ${idUser}::uuid
       AND r."status" = 'FINISHED'::"TestStatus"
       AND r."bandScore" > 0
     GROUP BY day, t."testType"
     ORDER BY day ASC
  `;

    type DayRow = { date: string; READING: number; LISTENING: number; WRITING: number; SPEAKING: number };
    const dayMap = new Map<string, DayRow>();

    for (const row of rows) {
      const dateKey = row.day.toISOString().split('T')[0];
      if (!dayMap.has(dateKey)) {
        dayMap.set(dateKey, {
          date: dateKey,
          READING: 0, LISTENING: 0, WRITING: 0, SPEAKING: 0,
        });
      }
      const day = dayMap.get(dateKey)!;
      if (row.testType in day) {
        (day as any)[row.testType] = row.avg ? Math.round(row.avg * 2) / 2 : 0;
      }
    }

    const statistics = Array.from(dayMap.values());
    await this.cache.set(cacheKey, statistics, 60);
    return statistics;
  }

  async addTargetExam(idUser: string, createTargetExam: CreateTargetExam) {
    const existingUser = await this.prisma.user.findUnique({
      where: { idUser },
    });

    if (!existingUser) throw new BadRequestException('User not found');

    const { targetExamDate, targetBandScore } = createTargetExam;

    const data = await this.prisma.user.update({
      where: { idUser },
      data: {
        ...(targetExamDate && { targetExamDate: new Date(targetExamDate) }),
        ...(targetBandScore && { targetBandScore: targetBandScore }),
      },
      select: {
        targetExamDate: true,
        targetBandScore: true,
      },
    });

    let daysRemaining = 0;

    if (data.targetExamDate) {
      const today = new Date();
      // differenceInDays trả về số nguyên (ngày đích - ngày hiện tại)
      const diff = differenceInDays(data.targetExamDate, today);

      // Nếu kết quả > 0 thì lấy, nếu âm (đã qua ngày thi) thì trả về 0
      daysRemaining = diff > 0 ? diff : 0;
    }

    return {
      message: 'Target updated successfully',
      data: {
        targetBandScore: data.targetBandScore,
        targetExamDate: data.targetExamDate,
        daysRemaining: daysRemaining,
      },
      status: 200,
    };
  }

  async getTargetExam(idUser: string) {
    const data = await this.prisma.user.findUnique({
      where: { idUser },
      select: {
        targetBandScore: true,
        targetExamDate: true,
      },
    });

    if (!data) throw new BadRequestException('User not found');

    return {
      message: 'Target exam retrieved successfully',
      data,
      status: 200,
    };
  }

  async getSkillOverview(idUser: string) {
    const cacheKey = `statistics:overview:${idUser}`;
    const cached = await this.cache.get<any>(cacheKey);
    if (cached) return cached;

    const user = await this.prisma.user.findUnique({
      where: { idUser },
      select: { targetBandScore: true },
    });
    const targetBand = user?.targetBandScore ?? null;

    const rows = await this.prisma.$queryRaw<
      Array<{ testType: string; avg: number | null }>
    >`
    SELECT t."testType" AS "testType", AVG(r."bandScore")::float AS "avg"
      FROM "UserTestResult" r
      JOIN "Test" t ON t."idTest" = r."idTest"
     WHERE r."idUser" = ${idUser}::uuid
       AND r."status" = 'FINISHED'::"TestStatus"
       AND r."bandScore" > 0
     GROUP BY t."testType"
  `;

    const roundToIeltsScore = (score: number): number =>
      Math.round(score * 2) / 2;

    const skills: Record<
      string,
      { currentBand: number | null; targetBand: number | null }
    > = {
      READING: { currentBand: null, targetBand },
      LISTENING: { currentBand: null, targetBand },
      WRITING: { currentBand: null, targetBand },
      SPEAKING: { currentBand: null, targetBand },
    };

    for (const row of rows) {
      if (row.testType in skills) {
        skills[row.testType].currentBand = row.avg ? roundToIeltsScore(row.avg) : null;
      }
    }

    await this.cache.set(cacheKey, skills, 300);
    return skills;
  }
}

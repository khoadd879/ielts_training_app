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
    // 1. Kiểm tra User tồn tại
    const existingUser = await this.prisma.user.findUnique({
      where: { idUser },
    });

    if (!existingUser) throw new BadRequestException('User not found');

    // 2. Lấy danh sách kết quả (chỉ lấy các trường cần thiết)
    const testResults = await this.prisma.userTestResult.findMany({
      where: {
        idUser,
        status: 'FINISHED',
      },
      select: {
        bandScore: true,
        createdAt: true,
        test: {
          select: {
            testType: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // 3. Định nghĩa kiểu dữ liệu cho việc nhóm
    type SkillData = { totalScore: number; count: number };
    type DayGroup = Record<string, SkillData>;

    const groupedByDate: Record<string, DayGroup> = {};

    // 4. Nhóm dữ liệu theo ngày và theo kỹ năng
    testResults.forEach((result) => {
      const dateKey = result.createdAt.toISOString().split('T')[0]; // Lấy định dạng YYYY-MM-DD
      const type = result.test.testType;

      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = {};
      }

      if (!groupedByDate[dateKey][type]) {
        groupedByDate[dateKey][type] = { totalScore: 0, count: 0 };
      }

      groupedByDate[dateKey][type].totalScore += result.bandScore;
      groupedByDate[dateKey][type].count += 1;
    });

    // 5. Hàm làm tròn chuẩn IELTS (0.25 -> 0.5, 0.75 -> 1.0)
    const roundToIelts = (score: number): number => {
      return Math.round(score * 2) / 2;
    };

    // 6. Tính toán kết quả cuối cùng
    const statistics = Object.entries(groupedByDate).map(([date, skills]) => {
      // Tính trung bình từng kỹ năng trong ngày đó
      const readingAvg = skills[TestType.READING]
        ? skills[TestType.READING].totalScore / skills[TestType.READING].count
        : 0;
      const listeningAvg = skills[TestType.LISTENING]
        ? skills[TestType.LISTENING].totalScore /
          skills[TestType.LISTENING].count
        : 0;
      const writingAvg = skills[TestType.WRITING]
        ? skills[TestType.WRITING].totalScore / skills[TestType.WRITING].count
        : 0;
      const speakingAvg = skills[TestType.SPEAKING]
        ? skills[TestType.SPEAKING].totalScore / skills[TestType.SPEAKING].count
        : 0;

      // Tính Overall chuẩn: (Trung bình R + Trung bình L + Trung bình W + Trung bình S) / 4
      const dailyOverall =
        (readingAvg + listeningAvg + writingAvg + speakingAvg) / 4;

      return {
        date,
        OVERALL: roundToIelts(dailyOverall),
        READING: roundToIelts(readingAvg),
        LISTENING: roundToIelts(listeningAvg),
        WRITING: roundToIelts(writingAvg),
        SPEAKING: roundToIelts(speakingAvg),
      };
    });

    return {
      message: 'Statistics retrieved successfully',
      data: statistics,
      status: 200,
    };
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
    const cacheKey = `skill-overview:${idUser}`;
    const cached = await this.cache.get<any>(cacheKey);
    if (cached) return cached;

    const user = await this.prisma.user.findUnique({
      where: { idUser },
      select: { targetBandScore: true },
    });
    if (!user) throw new BadRequestException('User not found');

    const finishedResults = await this.prisma.userTestResult.findMany({
      where: { idUser, status: 'FINISHED' },
      select: {
        bandScore: true,
        test: { select: { testType: true } },
      },
    });

    const roundToIeltsScore = (score: number): number =>
      Math.round(score * 2) / 2;

    const targetBand = user.targetBandScore ?? null;

    const skills: Record<
      string,
      { currentBand: number | null; targetBand: number | null }
    > = {
      READING: { currentBand: null, targetBand },
      LISTENING: { currentBand: null, targetBand },
      WRITING: { currentBand: null, targetBand },
      SPEAKING: { currentBand: null, targetBand },
    };

    for (const type of Object.keys(skills)) {
      const list = finishedResults.filter(
        (r) => r.test.testType === type,
      );
      if (list.length === 0) continue;
      const avg =
        list.reduce((a, b) => a + b.bandScore, 0) / list.length;
      skills[type].currentBand = roundToIeltsScore(avg);
    }

    const result = {
      message: 'Skill overview retrieved successfully',
      data: {
        reading: skills.READING,
        listening: skills.LISTENING,
        writing: skills.WRITING,
        speaking: skills.SPEAKING,
      },
      status: 200,
    };
    await this.cache.set(cacheKey, result, 300);
    return result;
  }
}

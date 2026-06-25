import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { DatabaseService } from 'src/database/database.service';
import { Level, Test, TestType } from '@prisma/client';

const LevelWeight = {
  [Level.Low]: 1,
  [Level.Mid]: 2,
  [Level.High]: 3,
  [Level.Great]: 4,
};

@Injectable()
export class RecommendTestService {
  private readonly logger = new Logger(RecommendTestService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    @Inject(CACHE_MANAGER) private cache: Cache,
  ) {}

  async getSimpleRecommendations(idUser: string, limit = 2): Promise<Test[]> {
    const existingUser = await this.databaseService.user.findUnique({
      where: { idUser },
    });

    if (!existingUser) throw new NotFoundException('User not found');

    const cacheKey = `recommend-test:${idUser}`;
    let payload = await this.cache.get<{
      availableTests: Array<{
        idTest: string;
        title: string;
        testType: string;
        level: string;
        duration: number;
      }>;
      userProfile: ReturnType<typeof this.analyzeUserProfile>;
    }>(cacheKey);

    if (!payload) {
      // 1. Lấy lịch sử & Phân tích profile
      const userHistory = await this.databaseService.userTestResult.findMany({
        where: { idUser, status: 'FINISHED' },
        select: {
          bandScore: true,
          test: { select: { testType: true, level: true, idTest: true } },
        },
      });

      const completedTestIds = userHistory.map((h) => h.test.idTest);
      const userProfile = this.analyzeUserProfile(userHistory);

      // 2. Lấy TOÀN BỘ bài test chưa làm
      const availableTests = await this.databaseService.test.findMany({
        where: {
          idTest: { notIn: completedTestIds },
        },
        select: {
          idTest: true,
          title: true,
          testType: true,
          level: true,
          duration: true,
        },
      });

      payload = { availableTests, userProfile };
      // Cache payload — invalidate khi user nộp bài (xem test-result service).
      await this.cache.set(cacheKey, payload, 600);
    }

    const { availableTests, userProfile } = payload;
    if (availableTests.length === 0) return [];

    // 3. Tính điểm (Scoring) — random mỗi request để user thấy đề xuất thay đổi
    const scoredTests = availableTests.map((test) => {
      let score = 0;

      if (test.testType === userProfile.weakestSkill) score += 50;

      const diff =
        LevelWeight[test.level as Level] - LevelWeight[userProfile.currentLevel];
      if (diff === 0) score += 30;
      else if (diff === 1) score += 15;
      else if (diff === -1) score += 5;
      else score -= 20;

      score += Math.random() * 10;
      return { test, score };
    });

    scoredTests.sort((a, b) => b.score - a.score);

    const poolSize = Math.max(limit * 3, 5);
    const topCandidates = scoredTests.slice(0, poolSize);
    const shuffledCandidates = this.shuffleArray(topCandidates);
    return shuffledCandidates.slice(0, limit).map((item) => item.test);
  }

  // --- Helper: Hàm trộn mảng (Fisher-Yates Shuffle) ---
  private shuffleArray(array: any[]) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // ... (Các hàm analyzeUserProfile, mapBandToLevel giữ nguyên như cũ)
  private analyzeUserProfile(history: any[]) {
    if (!history || history.length === 0) {
      return {
        currentLevel: Level.Low,
        weakestSkill: this.getRandomTestType(),
        averageBand: 0,
      };
    }
    const skillStats: Record<string, { total: number; count: number }> = {};
    let totalBand = 0;
    for (const record of history) {
      const type = record.test.testType;
      const score = record.bandScore || 0;
      if (!skillStats[type]) skillStats[type] = { total: 0, count: 0 };
      skillStats[type].total += score;
      skillStats[type].count += 1;
      totalBand += score;
    }
    let weakestSkill: TestType | null = null;
    let minAvgScore = 10.0;
    Object.keys(skillStats).forEach((key) => {
      const avg = skillStats[key].total / skillStats[key].count;
      if (avg < minAvgScore) {
        minAvgScore = avg;
        weakestSkill = key as TestType;
      }
    });
    const overallAvg = totalBand / history.length;
    const currentLevel = this.mapBandToLevel(overallAvg);
    return {
      currentLevel,
      weakestSkill: weakestSkill || this.getRandomTestType(),
      averageBand: overallAvg,
    };
  }

  private mapBandToLevel(band: number): Level {
    if (band < 4.0) return Level.Low;
    if (band < 6.0) return Level.Mid;
    if (band < 7.5) return Level.High;
    return Level.Great;
  }

  private getRandomTestType(): TestType {
    const types = [
      TestType.LISTENING,
      TestType.READING,
      TestType.WRITING,
      TestType.SPEAKING,
    ];
    return types[Math.floor(Math.random() * types.length)];
  }
}

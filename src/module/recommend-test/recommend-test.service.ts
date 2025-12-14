import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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

  constructor(private readonly databaseService: DatabaseService) {}

  async getSimpleRecommendations(idUser: string, limit = 2): Promise<Test[]> {
    const existingUser = await this.databaseService.user.findUnique({where:{idUser}})
    
    if(!existingUser) throw new NotFoundException('User not found')
    // 1. Lấy lịch sử & Phân tích profile (Giữ nguyên)
    const userHistory = await this.databaseService.userTestResult.findMany({
      where: { idUser, status: 'FINISHED' },
      select: {
        band_score: true,
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
    });

    if (availableTests.length === 0) return [];

    // 3. Tính điểm (Scoring)
    const scoredTests = availableTests.map((test) => {
      let score = 0;

      // -- Logic tính điểm (Giữ nguyên hoặc tinh chỉnh nhẹ) --
      if (test.testType === userProfile.weakestSkill) score += 50;

      const diff = LevelWeight[test.level] - LevelWeight[userProfile.currentLevel];
      if (diff === 0) score += 30;       // Vừa sức
      else if (diff === 1) score += 15;  // Thử thách 1 chút
      else if (diff === -1) score += 5;  // Ôn tập
      else score -= 20;                  // Quá khó hoặc quá dễ

      // Tăng tính ngẫu nhiên tại đây (Random từ 0 -> 10 điểm thay vì 5)
      // Để các bài xêm xêm nhau có cơ hội tráo đổi vị trí
      score += Math.random() * 10; 

      return { test, score };
    });

    // 4. Sắp xếp giảm dần theo điểm
    scoredTests.sort((a, b) => b.score - a.score);

    // --- THAY ĐỔI QUAN TRỌNG Ở ĐÂY ---
    
    // Quy tắc: Tạo Pool ứng viên. 
    // Nếu cần lấy 'limit' (ví dụ 2), ta sẽ xét trong Top 'poolSize' (ví dụ 6 hoặc 10)
    // Công thức: Lấy gấp 3 lần số lượng cần thiết, hoặc tối thiểu 5 bài.
    const poolSize = Math.max(limit * 3, 5);
    
    // Lấy ra nhóm "Top Tier" (Những bài điểm cao nhất)
    const topCandidates = scoredTests.slice(0, poolSize);

    // Trộn ngẫu nhiên nhóm này (Shuffle)
    const shuffledCandidates = this.shuffleArray(topCandidates);

    // Lấy ra số lượng cần thiết cuối cùng
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
      const score = record.band_score || 0;
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
    const types = [TestType.LISTENING, TestType.READING, TestType.WRITING, TestType.SPEAKING];
    return types[Math.floor(Math.random() * types.length)];
  }
}
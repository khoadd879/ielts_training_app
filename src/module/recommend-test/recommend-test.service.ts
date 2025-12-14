import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { Level, Test, TestType } from '@prisma/client';

// Map Level sang giá trị số để dễ so sánh
const LevelWeight = {
  [Level.Low]: 1,
  [Level.Mid]: 2,
  [Level.High]: 3,
  [Level.Great]: 4,
};

@Injectable()
export class RecommendTestService {

  constructor(private readonly databaseService: DatabaseService) {}

  async getSimpleRecommendations(idUser: string, limit = 2): Promise<Test[]> {
    // 1. Lấy lịch sử làm bài
    const userHistory = await this.databaseService.userTestResult.findMany({
      where: { idUser, status: 'FINISHED' },
      select: {
        band_score: true,
        test: { select: { testType: true, level: true, idTest: true } },
      },
    });

    const completedTestIds = userHistory.map((h) => h.test.idTest);

    // 2. Phân tích Profile người dùng (Level hiện tại & Kỹ năng yếu nhất)
    const userProfile = this.analyzeUserProfile(userHistory);
    
    // 3. Lấy danh sách bài test CÓ SẴN (trừ bài đã làm)
    // Tối ưu: Chỉ lấy những field cần thiết để tính toán
    const availableTests = await this.databaseService.test.findMany({
      where: {
        idTest: { notIn: completedTestIds },
        // Có thể filter thêm: chỉ lấy những bài có level loanh quanh level user
        // level: { in: [userProfile.currentLevel, this.getNextLevel(userProfile.currentLevel)] } 
      },
    });

    if (availableTests.length === 0) {
      // Fallback nếu hết bài: Trả về bài cũ làm điểm thấp để cải thiện
      return []; 
    }

    // 4. Thuật toán Scoring (Tính điểm phù hợp)
    const scoredTests = availableTests.map((test) => {
      let score = 0;

      // Tiêu chí 1: Ưu tiên kỹ năng yếu (Quan trọng nhất)
      if (test.testType === userProfile.weakestSkill) {
        score += 50;
      }

      // Tiêu chí 2: Độ phù hợp Level
      const testLevelVal = LevelWeight[test.level];
      const userLevelVal = LevelWeight[userProfile.currentLevel];

      if (testLevelVal === userLevelVal) {
        score += 30; // Vừa sức
      } else if (testLevelVal === userLevelVal + 1) {
        score += 15; // Thử thách (cao hơn 1 bậc)
      } else if (testLevelVal < userLevelVal) {
        score += 5; // Ôn tập lại (thấp hơn)
      } else {
        score -= 20; // Quá khó (cao hơn > 1 bậc)
      }

      // Tiêu chí 3: Random factor (tránh việc lúc nào cũng gợi ý y chang nhau nếu chưa làm)
      score += Math.random() * 5;

      return { test, score };
    });

    // 5. Sắp xếp giảm dần theo điểm score và lấy top
    scoredTests.sort((a, b) => b.score - a.score);

    return scoredTests.slice(0, limit).map((item) => item.test);
  }

  // --- Helper Logic ---

  private analyzeUserProfile(history: any[]) {
    // Mặc định cho user mới (Cold start)
    if (!history || history.length === 0) {
      return {
        currentLevel: Level.Low,
        weakestSkill: this.getRandomTestType(),
        averageBand: 0,
      };
    }

    // Tính điểm trung bình theo từng Skill
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

    // Tìm skill có điểm trung bình thấp nhất
    let weakestSkill: TestType | null = null;
    let minAvgScore = 10.0; // Max IELTS is 9.0

    Object.keys(skillStats).forEach((key) => {
      const avg = skillStats[key].total / skillStats[key].count;
      if (avg < minAvgScore) {
        minAvgScore = avg;
        weakestSkill = key as TestType;
      }
    });

    // Tính Level tổng quan của user
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
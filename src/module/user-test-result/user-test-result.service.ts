import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class UserTestResultService {
  constructor(private readonly databaseService: DatabaseService) {}

  async findAllTestResultByIdUser(idUser: string) {
    const existingUser = await this.databaseService.user.findUnique({
      where: {
        idUser,
      },
    });

    if (!existingUser) throw new BadRequestException('User not found');

    const data = await this.databaseService.userTestResult.findMany({
      where: { idUser },
      include: {
        de: true,
        userAnswer: true,
      },
    });

    return {
      message: 'Test result retrieved successfully',
      data,
      status: 200,
    };
  }

  async findOne(idTestResult: string) {
    const data = await this.databaseService.userTestResult.findUnique({
      where: { idTestResult },
    });

    if (!data) throw new BadRequestException('Test result not found');

    return {
      message: 'Test result retrieved successfully',
      data,
      status: 200,
    };
  }

  async deleteTestResult(idTestResult: string) {
    const existingTestResult =
      await this.databaseService.userTestResult.findUnique({
        where: {
          idTestResult,
        },
      });

    if (!existingTestResult) throw new BadRequestException('User not found');

    await this.databaseService.userTestResult.delete({
      where: {
        idTestResult,
      },
    });

    return {
      message: 'Test result deleted successfully',
      status: 200,
    };
  }

  async startTest(idUser: string, idTest: string) {
    // Kiểm tra user
    const existingUser = await this.databaseService.user.findUnique({
      where: { idUser },
    });
    if (!existingUser) throw new BadRequestException('User not found');

    // Kiểm tra test
    const existingTest = await this.databaseService.de.findUnique({
      where: { idDe: idTest },
    });
    if (!existingTest) throw new BadRequestException('Test not found');

    const testResult = await this.databaseService.userTestResult.create({
      data: {
        idUser,
        idDe: idTest,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
    });

    return {
      message: 'Test started',
      status: 200,
      data: testResult,
    };
  }

  async resetTest(idTestResult: string) {
    const result = await this.databaseService.$transaction(async (tx) => {
      const deletedAnswers = await tx.userAnswer.deleteMany({
        where: { idTestResult },
      });
      await tx.userTestResult.delete({ where: { idTestResult } });
      return deletedAnswers.count;
    });

    return {
      message: `Test reset successfully, deleted ${result} answers`,
      status: 200,
    };
  }

  async finishTest(testResultId: string) {
    const result = await this.databaseService.userTestResult.update({
      where: { idTestResult: testResultId },
      data: { status: 'FINISHED', finishedAt: new Date() },
      include: { user: true, de: true },
    });

    // 🧮 Tính XP nhận được — xử lý trường hợp level null
    const xpGained = this.calculateXp(
      result.de?.level ?? 'Low',
      result.band_score,
    );

    // 🧠 Cập nhật XP + kiểm tra lên level
    await this.updateUserXpAndLevel(result.idUser, xpGained);

    return { message: 'Test finished', xpGained };
  }

  /**
   * Hàm tính XP dựa trên level và band score
   * - Low: hệ số 1.0
   * - Mid: hệ số 1.5
   * - High: hệ số 2.0
   */
  private calculateXp(level: 'Low' | 'Mid' | 'High', band: number): number {
    const levelMultiplier = level === 'Low' ? 1 : level === 'Mid' ? 1.5 : 2.0;

    const xp = Math.max(0, (band - 5) * 10 * levelMultiplier);
    return Math.round(xp);
  }

  /**
   * Cập nhật XP của user và kiểm tra nếu đủ để lên level mới
   */
  private async updateUserXpAndLevel(userId: string, xpGained: number) {
    const user = await this.databaseService.user.findUnique({
      where: { idUser: userId },
    });

    if (!user) return;

    let newXp = user.xp + xpGained;
    let currentLevel = user.level ?? 'Low'; // xử lý null
    let xpToNext = user.xpToNext ?? 100; // fallback an toàn

    while (newXp >= xpToNext) {
      newXp -= xpToNext;
      currentLevel = this.getNextLevel(currentLevel);
      xpToNext = Math.floor(xpToNext * 1.5); // tăng ngưỡng khó hơn mỗi lần
    }

    await this.databaseService.user.update({
      where: { idUser: userId },
      data: {
        xp: newXp,
        level: currentLevel,
        xpToNext,
      },
    });
  }

  /**
   * Trả về level tiếp theo
   */
  private getNextLevel(level: 'Low' | 'Mid' | 'High') {
    switch (level) {
      case 'Low':
        return 'Mid';
      case 'Mid':
        return 'High';
      default:
        return 'High';
    }
  }
}

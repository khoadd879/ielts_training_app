import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { StreakService } from '../streak-service/streak-service.service';

@Injectable()
export class UserTestResultService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly streakService: StreakService,
  ) {}

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
        test: true,
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
    const existingTest = await this.databaseService.test.findUnique({
      where: { idTest },
    });
    if (!existingTest) throw new BadRequestException('Test not found');

    const testResult = await this.databaseService.userTestResult.create({
      data: {
        idUser,
        idTest,
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

  async finishTest(idTestResult: string, idUser: string) {
    // 1. Lấy thông tin bài làm và kiểm tra quyền sở hữu
    const testResult = await this.databaseService.userTestResult.findFirst({
      where: {
        idTestResult: idTestResult,
        idUser: idUser, // Đảm bảo bài làm này là của đúng user
      },
      include: {
        userAnswer: true, // Lấy kèm các câu trả lời để chấm điểm
        test: true, // Lấy kèm thông tin đề thi để biết level
      },
    });

    // Nếu không tìm thấy hoặc không đúng chủ sở hữu
    if (!testResult) {
      throw new NotFoundException(
        'Test result not found or you do not have permission.',
      );
    }

    // Nếu bài thi đã được hoàn thành trước đó
    if (testResult.status !== 'IN_PROGRESS') {
      throw new BadRequestException('This test has already been finished.');
    }

    // 2. Chấm điểm và tính toán kết quả
    const total_questions = testResult.test.numberQuestion; // Lấy tổng số câu hỏi từ đề
    const total_correct = testResult.userAnswer.filter(
      (answer) => answer.isCorrect,
    ).length;

    // Hàm tính band score ví dụ, bạn có thể thay đổi công thức
    const band_score = this.calculateBandScore(total_correct, total_questions);

    // 3. Cập nhật kết quả cuối cùng vào database
    await this.databaseService.userTestResult.update({
      where: { idTestResult: idTestResult },
      data: {
        status: 'FINISHED',
        finishedAt: new Date(),
        total_correct: total_correct,
        total_questions: total_questions,
        band_score: band_score, // Lưu lại band score đã tính
      },
    });

    // 4. Tính toán và cập nhật XP (Sử dụng các hàm có sẵn của bạn)
    const xpGained = this.calculateXp(testResult.test.level, band_score);
    await this.updateUserXpAndLevel(idUser, xpGained);

    // 5. Cập nhật chuỗi học
    try {
      await this.streakService.updateStreak(idUser);
    } catch (error) {
      console.error(
        `Failed to update streak for user ${idUser} after finishing test`,
        error,
      );
    }

    // 6. Trả về kết quả
    return {
      message: 'Test finished successfully!',
      xpGained: xpGained,
      band_score: band_score,
      status: 200,
    };
  }

  //Hàm tính band score
  private calculateBandScore(
    correctAnswers: number,
    totalQuestions: number,
  ): number {
    if (totalQuestions === 0) return 0;
    // Đây là công thức ví dụ, bạn nên thay bằng thang điểm thật của IELTS Reading/Listening
    // Ví dụ: 39-40 câu đúng -> 9.0, 37-38 -> 8.5, v.v.
    const ratio = correctAnswers / totalQuestions;
    // Làm tròn đến 0.5 (ví dụ: 7.2 -> 7.0, 7.3 -> 7.5, 7.8 -> 8.0)
    return Math.round(ratio * 9 * 2) / 2;
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

  async findAllTestResults() {
    const data = await this.databaseService.userTestResult.findMany({
      include: {
        user: {
          select: {
            idUser: true,
            nameUser: true,
            avatar: true,
          },
        },
        test: true,
      },
    });
    return {
      message: 'Test results retrieved successfully',
      data,
      status: 200,
    };
  }
}

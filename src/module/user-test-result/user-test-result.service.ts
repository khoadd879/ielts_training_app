import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { StreakService } from '../streak-service/streak-service.service';
import { TestStatus } from '@prisma/client';

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
      where: { idUser, status: TestStatus.FINISHED },
      orderBy:{
        createdAt: 'desc'
      },
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

    if (!existingTestResult) throw new BadRequestException('Test result not found');

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
    const existingUser = await this.databaseService.user.findUnique({
      where: { idUser },
    });
    if (!existingUser) throw new BadRequestException('User not found');

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
  // 1. Kiểm tra User tồn tại
  const existingUser = await this.databaseService.user.findUnique({
    where: { idUser },
  });
  if (!existingUser) throw new BadRequestException('User not found');

  // 2. Lấy thông tin bài test và câu trả lời của user
  const testResult = await this.databaseService.userTestResult.findFirst({
    where: {
      idTestResult: idTestResult,
      idUser: idUser,
    },
    include: {
      userAnswer: true,
      test: {
        include: {
          parts: {
            include: {
              groupOfQuestions: {
                include: {
                  question: {
                    include: {
                      answers: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!testResult) {
    throw new NotFoundException('Test result not found or you do not have permission.');
  }

  if (testResult.status !== 'IN_PROGRESS') {
    throw new BadRequestException('This test is not in progress.');
  }

  // 3. Gom tất cả câu hỏi của bài test vào một mảng để dễ tìm kiếm
  const allQuestions = testResult.test.parts
    .flatMap((p) => p.groupOfQuestions)
    .flatMap((g) => g.question);

  // 4. Chấm điểm từng câu trả lời
  const gradingResults = await Promise.all(
    testResult.userAnswer.map(async (uAnswer) => {
      const questionData = allQuestions.find(
        (q) => q.idQuestion === uAnswer.idQuestion,
      );

      // Nếu không có dữ liệu câu hỏi hoặc user không trả lời -> Sai (0 điểm)
      if (!questionData || !uAnswer.answerText) return 0;

      let isCorrect = false;
      const userTextRaw = uAnswer.answerText.trim();
      const userTextNormalized = userTextRaw.toLowerCase();

      // --- LOGIC CHẤM ĐIỂM ---
      if (uAnswer.userAnswerType === 'MCQ') {
        // Lấy danh sách các KEY đúng trong DB (ví dụ: ['A', 'D'])
        const correctKeys = questionData.answers
          .filter((a) => a.matching_value === 'CORRECT')
          .map((a) => a.matching_key?.trim().toUpperCase());

        // Lấy đáp án User chọn (Ưu tiên dùng matching_key nếu FE gửi, không thì tách từ answerText)
        let userSelectedKeys: string[] = [];
        if (uAnswer.matching_key) {
          userSelectedKeys = [uAnswer.matching_key.trim().toUpperCase()];
        } else {
          // Trường hợp FE gửi "A, B" vào answerText
          userSelectedKeys = userTextRaw.split(',').map((s) => s.trim().toUpperCase());
        }

        // So sánh: Đúng 1 trong 2 là được
        if (correctKeys.length > 0 && userSelectedKeys.length > 0) {
          // Chỉ cần tất cả những gì user chọn ĐỀU NẰM TRONG tập đáp án đúng
          // Ví dụ: Đúng là [A, B]. User chọn [A] -> correctKeys.includes('A') -> True.
          isCorrect = userSelectedKeys.every((key) => correctKeys.includes(key));
        }
      } else {
        // CASE: YES_NO_NOTGIVEN, FILL_BLANK, SHORT_ANSWER
        // So sánh chuỗi text (không phân biệt hoa thường)
        isCorrect = questionData.answers.some((a) => {
          const dbAnswerText = a.answer_text?.trim().toLowerCase();
          const dbMatchingValue = a.matching_value?.trim().toLowerCase();
          
          // Kiểm tra cả answer_text hoặc matching_value (tùy cách bạn lưu DB)
          return dbAnswerText === userTextNormalized || dbMatchingValue === userTextNormalized;
        });
      }

      // 5. Cập nhật trạng thái đúng/sai vào DB cho từng câu nếu có thay đổi
      if (uAnswer.isCorrect !== isCorrect) {
        await this.databaseService.userAnswer.update({
          where: { idUserAnswer: uAnswer.idUserAnswer },
          data: { isCorrect: isCorrect },
        });
      }

      return isCorrect ? 1 : 0;
    }),
  );

  // 6. Tổng kết điểm số
  const total_correct = gradingResults.reduce((sum, val) => sum + val, 0);
  const actualTotalQuestions = allQuestions.length;

  // Tính IELTS Band Score (Ví dụ: 30/40 -> 7.0)
  const band_score = this.calculateIELTSBandScore(
    total_correct,
    actualTotalQuestions,
  );

  // 7. Cập nhật XP và Level
  const xpGained = this.calculateXp(testResult.test.level, band_score);
  await this.updateUserXpAndLevel(idUser, xpGained);

  // 8. Cập nhật Streak
  try {
    await this.streakService.updateStreak(idUser);
  } catch (error) {
    console.error(`Failed to update streak for user ${idUser}`, error);
  }

  // 9. Cập nhật kết quả cuối cùng vào UserTestResult
  const updatedResult = await this.databaseService.userTestResult.update({
    where: { idTestResult: idTestResult },
    data: {
      status: 'FINISHED',
      finishedAt: new Date(),
      total_correct: total_correct,
      total_questions: actualTotalQuestions,
      band_score: band_score,
      score: total_correct, // raw score
    },
  });

  return {
    message: 'Test finished successfully!',
    data: {
      xpGained,
      band_score,
      total_correct,
      total_questions: actualTotalQuestions,
      finishedAt: updatedResult.finishedAt,
    },
    status: 200,
  };
}

  /**
   * Hàm tính XP dựa trên level và band score
   * - Low: hệ số 1.0
   * - Mid: hệ số 1.5
   * - High: hệ số 2.0
   */
  private calculateXp(
    level: 'Low' | 'Mid' | 'High' | 'Great',
    band: number,
  ): number {
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
    let currentLevel = user.level ?? 'Low';
    let xpToNext = user.xpToNext ?? 100;

    while (newXp >= xpToNext) {
      newXp -= xpToNext;
      currentLevel = this.getNextLevel(currentLevel);
      xpToNext = Math.floor(xpToNext * 1.5);
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
  private getNextLevel(level: 'Low' | 'Mid' | 'High' | 'Great') {
    switch (level) {
      case 'Low':
        return 'Mid';
      case 'Mid':
        return 'High';
      case 'High':
        return 'Great';
      default:
        return 'Great';
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

  private calculateIELTSBandScore(correct: number, total: number): number {
    if (total !== 40) {
      // Fallback nếu đề không phải chuẩn 40 câu
      return Math.round((correct / total) * 9 * 2) / 2;
    }

    // Thang điểm tham khảo IELTS Listening
    if (correct >= 39) return 9.0;
    if (correct >= 37) return 8.5;
    if (correct >= 35) return 8.0;
    if (correct >= 32) return 7.5;
    if (correct >= 30) return 7.0;
    if (correct >= 26) return 6.5;
    if (correct >= 23) return 6.0;
    if (correct >= 18) return 5.5;
    if (correct >= 16) return 5.0;
    if (correct >= 13) return 4.5;
    if (correct >= 10) return 4.0;
    return 0.0;
  }

  async getAllAnswerInTestResult(idTestResult: string) {
    const data = await this.databaseService.userTestResult.findFirst({
      where: {
        idTestResult: idTestResult,
        status: TestStatus.FINISHED,
      },
      orderBy:{
        updatedAt: 'desc'
      },
      
      include: {
        userAnswer: true,
        test: {
          include: {
            parts: {
              include: {
                passage: true,
                groupOfQuestions: {
                  include: {
                    question: {
                      include: {
                        answers: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!data) throw new NotFoundException('Test result not found');

    return {
      message: 'Test result and answers retrieved successfully',
      data,
      status: 200,
    };
  }
}
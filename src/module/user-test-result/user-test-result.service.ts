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
    const existingUser = await this.databaseService.user.findUnique({
      where: { idUser },
    });
    if (!existingUser) throw new BadRequestException('User not found');


    const testResult = await this.databaseService.userTestResult.findFirst({
      where: {
        idTestResult: idTestResult,
        idUser: idUser,
      },
      include: {
        userAnswer: true,
        test: {
          include:{
            parts:{
              include:{
                groupOfQuestions:{
                  include:{
                    question:{
                      include: {
                        answers: true
                      }
                    }
                  }
                }
              }
            }
          }
        }, 
      },
    });

    if (!testResult) {
      throw new NotFoundException(
        'Test result not found or you do not have permission.',
      );
    }

    if (testResult.status !== 'IN_PROGRESS') {
      throw new BadRequestException('This test is not in progress.');
    }

    const allQuestions = testResult.test.parts
    .flatMap(p => p.groupOfQuestions)
    .flatMap(g => g.question);

  let total_correct = 0;

    // Hàm tính band score ví dụ, bạn có thể thay đổi công thức
    const updatePromises = testResult.userAnswer.map(async (uAnswer) => {
    const questionData = allQuestions.find(q => q.idQuestion === uAnswer.idQuestion);
    
    // Nếu không tìm thấy câu hỏi hoặc user không trả lời -> bỏ qua (sai)
    if (!questionData || !uAnswer.answerText) return;

    let isCorrect = false;
    const userTextRaw = uAnswer.answerText.trim();
    const userTextNormalized = userTextRaw.toLowerCase();

    if (uAnswer.userAnswerType === 'MCQ') {
      // 1. Lấy tất cả đáp án ĐÚNG từ DB của câu hỏi này
        // (Giả sử bạn quy định matching_value = 'CORRECT' là đúng)
        const correctAnswersInDB = questionData.answers
            .filter(a => a.matching_value === 'CORRECT')
            .map(a => a.matching_key); // Lấy ra mảng ['A', 'C']

        // 2. Lấy đáp án User gửi lên
        // Giả sử user gửi "A,C" -> tách thành mảng ['A', 'C']
        // Nếu user chỉ gửi "A" -> tách thành ['A']
        const userSelectedAnswers = userTextRaw.split(',').map(s => s.trim());

        // 3. So sánh 2 mảng này
        // Cách chấm: User phải chọn ĐÚNG và ĐỦ tất cả các đáp án (Strict Grading)
        if (correctAnswersInDB.length > 0) {
            // Kiểm tra số lượng phải khớp
            const isSameLength = correctAnswersInDB.length === userSelectedAnswers.length;
            
            // Kiểm tra từng đáp án user chọn có nằm trong list đúng không
            const hasAllCorrect = userSelectedAnswers.every(val => correctAnswersInDB.includes(val));

            if (isSameLength && hasAllCorrect) {
                isCorrect = true;
            }
        }
    } 
    
    // CASE B: TFNG / YES_NO / FILL_BLANK / SHORT_ANSWER (Nhập text hoặc chọn nút)
    else {
      // Loại này trong DB thường chỉ lưu đáp án ĐÚNG.
      // Ví dụ: DB lưu "TRUE", User gửi "TRUE" -> Đúng.
      // Ví dụ: DB lưu "chicken", User gửi "Chicken" -> Đúng.
      
      const isMatch = questionData.answers.some(a => {
        // So sánh text (chấp nhận chữ hoa thường)
        if (!a.answer_text) return false;
        return a.answer_text.trim().toLowerCase() === userTextNormalized;
      });

      if (isMatch) isCorrect = true;
    }

    if (isCorrect) total_correct++;

    // Update trạng thái đúng sai vào từng câu trả lời của user (để hiện màu xanh/đỏ ở frontend)
    if (uAnswer.isCorrect !== isCorrect) {
      return this.databaseService.userAnswer.update({
        where: { idUserAnswer: uAnswer.idUserAnswer },
        data: { isCorrect: isCorrect }
      });
    }
  });

  await Promise.all(updatePromises);

  const actualTotalQuestions = allQuestions.length;
    
    const band_score = this.calculateIELTSBandScore(
      total_correct,
      actualTotalQuestions,
    );

    const xpGained = this.calculateXp(testResult.test.level, band_score);
    await this.updateUserXpAndLevel(idUser, xpGained);

    try {
      await this.streakService.updateStreak(idUser);
    } catch (error) {
      console.error(
        `Failed to update streak for user ${idUser} after finishing test`,
        error,
      );
    }
    
    await this.databaseService.userTestResult.update({
      where: { idTestResult: idTestResult },
      data: {
        status: 'FINISHED',
        finishedAt: new Date(),
        total_correct: total_correct,
        total_questions: actualTotalQuestions,
        band_score: band_score,
        score: total_correct, 
      },
    });

    return {
      message: 'Test finished successfully!',
      xpGained: xpGained,
      band_score: band_score,
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
}

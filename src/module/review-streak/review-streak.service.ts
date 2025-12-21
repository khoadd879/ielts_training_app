import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Level } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { StreakService } from '../streak-service/streak-service.service';
import { SubmitReviewDto } from './dto/submit-review.dto';

@Injectable()
export class ReviewStreakService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly streakService: StreakService,
  ) { }

  async submitVocabularyReview(submitReviewDto: SubmitReviewDto) {
    const { idUser, answers } = submitReviewDto;
    const xpPerCorrectAnswer = 10; // Điểm kinh nghiệm cho mỗi câu trả lời đúng

    try {
      // Bắt đầu một transaction để đảm bảo toàn vẹn dữ liệu
      await this.databaseService.$transaction(async (prisma) => {
        // Xử lý từng câu trả lời trong mảng
        for (const answer of answers) {
          // Lấy thông tin hiện tại của từ vựng
          const tuVung = await prisma.vocabulary.findUnique({
            where: { idVocab: answer.idVocab, idUser: idUser }, // Đảm bảo từ vựng thuộc về user
          });

          if (!tuVung) {
            // Nếu từ vựng không tồn tại hoặc không phải của user, bỏ qua hoặc báo lỗi
            console.warn(
              `TuVung with id ${answer.idVocab} not found for user ${idUser}`,
            );
            continue; // Bỏ qua và xử lý từ tiếp theo
          }

          // ====== CHỐNG SPAM: Kiểm tra xem từ vựng đã được ôn tập hôm nay chưa ======
          const today = new Date();
          today.setHours(0, 0, 0, 0); // Đầu ngày hôm nay

          const lastReviewedDate = tuVung.lastReviewed
            ? new Date(tuVung.lastReviewed)
            : null;

          let alreadyReviewedToday = false;
          if (lastReviewedDate) {
            lastReviewedDate.setHours(0, 0, 0, 0);
            alreadyReviewedToday = lastReviewedDate.getTime() === today.getTime();
          }

          // Cập nhật chuỗi trả lời đúng
          const newCorrectStreak = answer.isCorrect
            ? tuVung.correctStreak + 1
            : 0;

          // Chỉ được nhận XP nếu CHƯA ôn tập từ này hôm nay
          const xpGained = answer.isCorrect && !alreadyReviewedToday ? xpPerCorrectAnswer : 0;

          // Cập nhật lại từ vựng trong database
          await prisma.vocabulary.update({
            where: { idVocab: answer.idVocab },
            data: {
              lastReviewed: new Date(),
              correctStreak: newCorrectStreak,
              xp: {
                increment: xpGained, // Chỉ cộng XP nếu chưa ôn hôm nay
              },
            },
          });

          // Chỉ cộng XP cho user nếu trả lời đúng VÀ chưa ôn từ này hôm nay
          if (xpGained > 0) {
            // Lấy thông tin user hiện tại để kiểm tra level up
            const currentUser = await prisma.user.findUnique({
              where: { idUser },
              select: { xp: true, level: true, xpToNext: true },
            });

            if (currentUser) {
              // Cộng XP mới vào XP hiện tại của user
              let newXp = (currentUser.xp ?? 0) + xpGained;
              let currentLevel = currentUser.level ?? Level.Low;
              let xpToNext = currentUser.xpToNext ?? 100;

              // Kiểm tra và xử lý level up
              while (newXp >= xpToNext) {
                newXp -= xpToNext;
                currentLevel = this.getNextLevel(currentLevel);
                xpToNext = this.updateXpToNext(currentLevel);
              }

              await prisma.user.update({
                where: { idUser },
                data: {
                  xp: newXp,
                  level: currentLevel,
                  xpToNext: xpToNext,
                },
              });
            }
          }
        }
      });
    } catch (error) {
      console.error('Transaction failed during vocabulary review:', error);
      throw new InternalServerErrorException(
        'Could not process review session.',
      );
    }

    // Sau khi transaction thành công, gọi hàm cập nhật chuỗi học
    // Đặt ngoài transaction để không làm chậm giao dịch với database
    try {
      await this.streakService.updateStreak(idUser);
    } catch (error) {
      console.error(
        `Failed to update streak for user ${idUser} after review`,
        error,
      );
    }

    const user = await this.databaseService.user.findUnique({
      where: { idUser },
      select: { xp: true, level: true, xpToNext: true },
    });

    return {
      message: 'Review session completed successfully!',
      data: {
        xp: user?.xp,
        level: user?.level,
        xpToNext: user?.xpToNext,
      }
    };
  }

  async getStreak(idUser: string) {
    const data = await this.databaseService.user.findUnique({
      where: { idUser },
      select: {
        lastStudiedAt: true,
        longestStreak: true,
        currentStreak: true,
      },
    });
    if (!data) throw new NotFoundException('User not found');

    return {
      message: 'Streak retrieved successfully',
      data,
      status: 200,
    };
  }

  /**
   * Trả về level tiếp theo
   */
  private getNextLevel(level: Level): Level {
    switch (level) {
      case Level.Low:
        return Level.Mid;
      case Level.Mid:
        return Level.High;
      case Level.High:
        return Level.Great;
      default:
        return Level.Great;
    }
  }

  private updateXpToNext(level: Level): number {
    switch (level) {
      case Level.Low:
        return 100;
      case Level.Mid:
        return 350;
      case Level.High:
        return 1000;
      default:
        return 100;
    }
  }
}

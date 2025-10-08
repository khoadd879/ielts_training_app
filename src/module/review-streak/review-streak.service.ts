import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { StreakService } from '../streak-service/streak-service.service';
import { SubmitReviewDto } from './dto/submit-review.dto';

@Injectable()
export class ReviewStreakService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly streakService: StreakService,
  ) {}

  async submitVocabularyReview(submitReviewDto: SubmitReviewDto) {
    const { idUser, answers } = submitReviewDto;
    const xpPerCorrectAnswer = 10; // Điểm kinh nghiệm cho mỗi câu trả lời đúng

    try {
      // Bắt đầu một transaction để đảm bảo toàn vẹn dữ liệu
      await this.databaseService.$transaction(async (prisma) => {
        // Xử lý từng câu trả lời trong mảng
        for (const answer of answers) {
          // Lấy thông tin hiện tại của từ vựng
          const tuVung = await prisma.tuVung.findUnique({
            where: { idTuVung: answer.idTuVung, idUser: idUser }, // Đảm bảo từ vựng thuộc về user
          });

          if (!tuVung) {
            // Nếu từ vựng không tồn tại hoặc không phải của user, bỏ qua hoặc báo lỗi
            console.warn(
              `TuVung with id ${answer.idTuVung} not found for user ${idUser}`,
            );
            continue; // Bỏ qua và xử lý từ tiếp theo
          }

          // Cập nhật chuỗi trả lời đúng và điểm kinh nghiệm
          const newCorrectStreak = answer.isCorrect
            ? tuVung.correctStreak + 1
            : 0;
          const xpGained = answer.isCorrect ? xpPerCorrectAnswer : 0;

          // Cập nhật lại từ vựng trong database
          await prisma.tuVung.update({
            where: { idTuVung: answer.idTuVung },
            data: {
              lastReviewed: new Date(),
              correctStreak: newCorrectStreak,
              xp: {
                increment: xpGained, // Cộng thêm điểm kinh nghiệm
              },
            },
          });
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
      // Không ném lỗi ra ngoài vì hành động chính đã thành công
    }

    return { message: 'Review session completed successfully!' };
  }
}

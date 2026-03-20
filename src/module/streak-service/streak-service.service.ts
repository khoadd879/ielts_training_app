import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';

// src/streak/streak.service.ts
@Injectable()
export class StreakService {
  constructor(private readonly databaseService: DatabaseService) {}

  async updateStreak(idUser: string): Promise<void> {
    const user = await this.databaseService.user.findUnique({
      where: { idUser },
      select: { currentStreak: true, longestStreak: true, lastStudiedAt: true },
    });

    if (!user) return;

    const today = new Date();
    const lastStudiedDate = user.lastStudiedAt;

    // Nếu chưa học bao giờ
    if (!lastStudiedDate) {
      user.currentStreak = 1;
    } else {
      // Chuẩn hóa ngày để chỉ so sánh ngày, không so sánh giờ
      const todayStart = new Date(today.setHours(0, 0, 0, 0));
      const lastStudiedStart = new Date(lastStudiedDate.setHours(0, 0, 0, 0));

      const diffTime = todayStart.getTime() - lastStudiedStart.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        // Đã học hôm nay, không làm gì cả
        return;
      } else if (diffDays <= 2) {
        // Nếu lần học cuối là hôm qua (diffDays=1) hoặc hôm kia (diffDays=2)
        // -> Chuỗi được tiếp tục
        user.currentStreak += 1;
      } else {
        // Nếu lần học cuối cách đây 3 ngày hoặc hơn (diffDays > 2)
        // -> Chuỗi bị mất, reset về 1
        user.currentStreak = 1;
      }
    }

    // Cập nhật chuỗi dài nhất nếu cần
    if (user.currentStreak > user.longestStreak) {
      user.longestStreak = user.currentStreak;
    }

    // Lưu lại vào database
    await this.databaseService.user.update({
      where: { idUser },
      data: {
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
        lastStudiedAt: today,
      },
    });
  }
}

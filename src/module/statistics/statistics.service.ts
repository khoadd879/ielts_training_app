import { Injectable } from '@nestjs/common';
import { CreateStatisticDto } from './dto/create-statistic.dto';
import { UpdateStatisticDto } from './dto/update-statistic.dto';
import { startOfWeek, endOfWeek, addDays, format } from 'date-fns';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class StatisticsService {
  constructor(private readonly prisma: DatabaseService) {}

  async getWeeklyScores(idUser: string) {
    // Tính ngày bắt đầu (thứ Hai) và ngày kết thúc (Chủ Nhật) của tuần hiện tại
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    const end = endOfWeek(new Date(), { weekStartsOn: 1 });

    // Lấy tất cả các bài làm trong tuần
    const tests = await this.prisma.userTestResult.findMany({
      where: {
        idUser,
        createdAt: { gte: start, lte: end },
        status: 'FINISHED',
      },
      select: {
        createdAt: true,
        band_score: true,
        de: { select: { loaiDe: true } },
      },
    });

    // Tạo danh sách các ngày trong tuần (thứ Hai -> Chủ Nhật)
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(start, i));
    }

    // Nhóm dữ liệu theo ngày và loại đề
    const result = days.map((day) => {
      const dateKey = format(day, 'yyyy-MM-dd');

      // Lọc các bài làm trong ngày hiện tại
      const dailyTests = tests.filter(
        (test) => format(test.createdAt, 'yyyy-MM-dd') === dateKey,
      );

      // Nhóm bài làm theo loại đề
      const groupedByType = {
        READING: dailyTests.filter((test) => test.de.loaiDe === 'READING'),
        LISTENING: dailyTests.filter((test) => test.de.loaiDe === 'LISTENING'),
        WRITING: dailyTests.filter((test) => test.de.loaiDe === 'WRITING'),
      };

      // Tính điểm trung bình cho từng loại đề
      const averages = Object.entries(groupedByType).map(([type, tests]) => {
        const scores = tests.map((test) => test.band_score);
        const avg = scores.length
          ? scores.reduce((a, b) => a + b, 0) / scores.length
          : 0;
        return { type, avg };
      });

      return {
        date: dateKey,
        averages,
      };
    });

    return result;
  }
}

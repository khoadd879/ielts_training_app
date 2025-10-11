import { Injectable } from '@nestjs/common';
import { CreateStatisticDto } from './dto/create-statistic.dto';
import { UpdateStatisticDto } from './dto/update-statistic.dto';
import { subWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class StatisticsService {
  constructor(private readonly prisma: DatabaseService) {}

  async getWeeklyScores(idUser: string) {
    const start = startOfWeek(new Date());
    const end = endOfWeek(new Date());

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

    const grouped: Record<'LISTENING' | 'READING' | 'WRITING', number[]> = {
      LISTENING: [],
      READING: [],
      WRITING: [],
    };
    for (const t of tests) {
      grouped[t.de.loaiDe].push(t.band_score);
    }

    return Object.entries(grouped).map(([type, scores]) => ({
      type,
      avg: scores.length
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : 0,
    }));
  }
}

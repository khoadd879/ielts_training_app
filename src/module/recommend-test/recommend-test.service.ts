import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { GoogleGenAI } from '@google/genai';
import { ConfigService } from '@nestjs/config';
import { Level, loaiDe, UserTestResult } from '@prisma/client';

// Hồ sơ năng lực người dùng
type PerformanceStats = {
  totalScore: number;
  count: number;
  avgScore: number;
};

//{ READING: { Low: { avgScore: 7.5, count: 2 } } }
type PerformanceProfile = Partial<
  Record<loaiDe, Partial<Record<Level, PerformanceStats>>>
>;

//Kiểu dữ liệu trả về từ hàm getTestHistoryKey
type TestHistoryResult = (UserTestResult & {
  de: {
    level: Level;
    loaiDe: loaiDe;
  };
})[];

@Injectable()
export class RecommendTestService {
  private readonly logger = new Logger(RecommendTestService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
  ) {}

  private getAIInstance(): GoogleGenAI {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.error('GEMINI_API_KEY is missing');
      throw new BadRequestException('AI API key is not configured');
    }
    return new GoogleGenAI({ apiKey });
  }

  //Lấy lịch sử làm bài
  async getTestHistoryKey(idUser: string) {
    const testHistory = await this.databaseService.userTestResult.findMany({
      where: {
        idUser,
        status: 'FINISHED',
      },
      include: {
        de: {
          select: { level: true, loaiDe: true },
        },
      },
    });
    return testHistory;
  }
}

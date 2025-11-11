import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  Inject, // Thêm Inject
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { GoogleGenAI } from '@google/genai';
import { ConfigService } from '@nestjs/config';
import { Level, Test, TestType, UserTestResult } from '@prisma/client';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

type AvailableTestSummary = {
  idTest: string;
  title: string;
  testType: TestType;
  level: Level;
};

type TestHistoryResult = (UserTestResult & {
  test: {
    level: Level;
    testType: TestType;
  };
})[];

type AIRecommendationResult = string[];

@Injectable()
export class RecommendTestService {
  private readonly logger = new Logger(RecommendTestService.name);
  private genAI: GoogleGenAI;

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.error('GEMINI_API_KEY is missing');
      throw new Error('AI API key is not configured');
    }
    this.genAI = new GoogleGenAI({ apiKey });
  }

  async getSimpleRecommendations(idUser: string): Promise<Test[]> {
    const testHistory = await this.getTestHistoryKey(idUser);

    if (testHistory.length === 0) {
      this.logger.log(
        `Cold start for user ${idUser}. Recommending default tests.`,
      );
      return this.recommendDefaultTests();
    }

    // Lấy danh sách các bài CHƯA LÀM
    const completedTestIds = testHistory.map((result) => result.idTest);
    const availableTests = await this.getAvailableTests(completedTestIds);

    if (availableTests.length === 0) {
      this.logger.warn(`User ${idUser} has completed all available tests.`);
      throw new NotFoundException(
        'Bạn đã hoàn thành tất cả các bài test có sẵn!',
      );
    }

    const prompt = this.createSimpleAIPrompt(testHistory, availableTests);

    // Key này dựa trên ID user và số lượng bài test có sẵn
    // (Nếu 'availableTests' thay đổi, cache sẽ tự động làm mới)
    const cacheKey = `recommendations:${idUser}:${availableTests.length}`;

    const recommendedIds = await this.callAIWithCache(prompt, cacheKey);

    if (recommendedIds.length === 0) {
      this.logger.warn(
        `AI did not return valid recommendations for user ${idUser}`,
      );
      return [];
    }

    return this.databaseService.test.findMany({
      where: {
        idTest: { in: recommendedIds },
      },
    });
  }

  async getTestHistoryKey(idUser: string): Promise<TestHistoryResult> {
    const testHistory = await this.databaseService.userTestResult.findMany({
      where: {
        idUser,
        status: 'FINISHED',
      },
      include: {
        test: {
          select: { level: true, testType: true },
        },
      },
    });
    return testHistory as TestHistoryResult;
  }

  private async getAvailableTests(
    excludedTestIds: string[],
  ): Promise<AvailableTestSummary[]> {
    return this.databaseService.test.findMany({
      where: {
        idTest: {
          notIn: excludedTestIds,
        },
      },
      select: {
        idTest: true,
        title: true,
        testType: true,
        level: true,
      },
    });
  }

  private createSimpleAIPrompt(
    historyData: TestHistoryResult,
    availableData: AvailableTestSummary[],
  ): string {
    const historyJSON = JSON.stringify(historyData, null, 2);
    const availableJSON = JSON.stringify(availableData, null, 2);

    return `
      **Bối cảnh:** Bạn là một gia sư IELTS AI.
      **Dữ liệu đầu vào:**
      1.  **Lịch sử bài đã làm (historyData):** ${historyJSON}
      2.  **Danh sách bài chưa làm (availableData):** ${availableJSON}
      **Nhiệm vụ:**
      1.  **Phân tích \`historyData\`:** Xác định điểm mạnh/yếu dựa trên \`band_score\`, \`test.level\`, và \`test.testType\`.
      2.  **Lựa chọn:** Từ \`availableData\`, chọn ra 2 bài test phù hợp nhất để cải thiện điểm yếu.
      3.  **Trả lời:** Chỉ trả lời bằng một mảng JSON chứa ID của các bài test được chọn (lấy từ \`idTest\`).
      **Định dạng trả lời bắt buộc (chỉ JSON):**
      ["id_test_1", "id_test_2"]
    `;
  }

  private async callAIWithCache(
    prompt: string,
    cacheKey: string,
  ): Promise<AIRecommendationResult> {
    const cachedData =
      await this.cacheManager.get<AIRecommendationResult>(cacheKey);
    if (cachedData) {
      this.logger.log(`Cache HIT for recommendations! Key: ${cacheKey}`);
      return cachedData;
    }

    this.logger.log(`Cache MISS. Calling AI for recommendations...`);

    try {
      const response = await this.genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const rawText = response.text?.trim() ?? '';
      const clean = rawText
        .replace(/```json/i, '')
        .replace(/```/g, '')
        .trim();

      let parsed: AIRecommendationResult;
      try {
        parsed = JSON.parse(clean);
        // Kiểm tra kỹ hơn
        if (
          !Array.isArray(parsed) ||
          !parsed.every((id) => typeof id === 'string')
        ) {
          this.logger.warn(
            'AI response was parsed but is not an array of strings',
            parsed,
          );
          throw new Error('Invalid AI response format - not array of strings');
        }
      } catch (err) {
        this.logger.error('JSON parse error from Gemini:', err, clean);
        throw new BadRequestException('Invalid AI response format');
      }

      await this.cacheManager.set(cacheKey, parsed, 900);
      return parsed;
    } catch (error) {
      this.logger.error('AI evaluation failed:', error);
      throw new BadRequestException('AI evaluation failed.');
    }
  }

  private async recommendDefaultTests(): Promise<Test[]> {
    try {
      const types: TestType[] = [
        TestType.LISTENING,
        TestType.READING,
        TestType.WRITING,
        TestType.SPEAKING,
      ];

      const defaultTestsPromises = types.map((type) =>
        this.databaseService.test.findFirst({
          where: {
            testType: type,
            level: Level.Low,
          },
        }),
      );

      const results = await Promise.all(defaultTestsPromises);
      return results.filter((test): test is Test => test !== null);
    } catch (error) {
      this.logger.error('Failed to get default tests for cold start', error);
      return [];
    }
  }
}

import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';

const STRATEGY_TIPS: Record<string, string[]> = {
  TRUE_FALSE_NOT_GIVEN: [
    'FALSE = chắc chắn sai, phủ định rõ ràng trong text',
    'NOT GIVEN = không đủ info để kết luận hoặc có mâu thuẫn',
  ],
  YES_NO_NOT_GIVEN: [
    'YES = đồng ý với claim trong text',
    'NO = không đồng ý với claim trong text',
    'NOT GIVEN = không đủ info để kết luận',
  ],
  MATCHING_HEADING: [
    'Đọc topic sentence của mỗi đoạn để tìm heading phù hợp',
    'Chú ý keywords và synonyms trong heading và đoạn',
  ],
  MATCHING_INFORMATION: [
    'Tìm specific information (names, dates, numbers, facts)',
    'Quét toàn bộ passage để locate thông tin',
  ],
  MATCHING_FEATURES: [
    'Match features với categories dựa trên characteristics',
    'Chú ý distinguishing features để phân biệt',
  ],
  MATCHING_SENTENCE_ENDINGS: [
    'Đọc sentence beginnings và chọn endings phù hợp về ngữ pháp và nghĩa',
    'Đảm bảo logical flow của câu',
  ],
  SENTENCE_COMPLETION: [
    'Đếm số từ cần điền theo instructions',
    'Copy từ text, chú ý spelling và grammar',
  ],
  SUMMARY_COMPLETION: [
    'Xác định xem summary dựa trên full passage hay một phần',
    'Điền từ hoặc cụm từ từ text',
  ],
  NOTE_COMPLETION: [
    'Đọc instructions để biết số từ cần điền',
    'Tìm thông tin liên quan trong passage',
  ],
  TABLE_COMPLETION: [
    'Xác định categories và rows trong bảng',
    'Scan passage để tìm relevant information',
  ],
  FLOW_CHART_COMPLETION: [
    'Theo dõi sequence của processes/steps',
    'Điền từ text vào đúng vị trí',
  ],
  DIAGRAM_LABELING: [
    'Identify parts của diagram từ passage',
    'Chú ý spatial relationships và descriptions',
  ],
  SHORT_ANSWER: [
    'Đếm số từ theo instructions (usually 1-3 words)',
    'Trả lời trực tiếp từ text, không diễn giải',
  ],
  MULTIPLE_CHOICE: [
    'Eliminate clearly wrong answers trước',
    'Chọn best answer dựa trên text',
  ],
};

@Injectable()
export class QuestionTypePerformanceService {
  constructor(private readonly db: DatabaseService) {}

  async trackQuestionTypePerformance(
    userId: string,
    testResultId: string,
    skillType: 'READING' | 'LISTENING',
  ) {
    const answers = await this.db.userAnswer.findMany({
      where: { idTestResult: testResultId, idUser: userId },
    });

    // Group by questionType
    const grouped = new Map<string, { total: number; correct: number }>();
    for (const ans of answers) {
      const existing = grouped.get(ans.answerType) ?? { total: 0, correct: 0 };
      existing.total++;
      if (ans.isCorrect) existing.correct++;
      grouped.set(ans.answerType, existing);
    }

    // Upsert each question type performance
    await this.db.$transaction(
      Array.from(grouped.entries()).map(([questionType, stats]) =>
        this.db.questionTypePerformance.upsert({
          where: {
            idUser_skillType_questionType: {
              idUser: userId,
              skillType,
              questionType,
            },
          },
          update: {
            totalAttempts: { increment: stats.total },
            correctCount: { increment: stats.correct },
            lastAttemptAt: new Date(),
          },
          create: {
            idUser: userId,
            skillType,
            questionType,
            totalAttempts: stats.total,
            correctCount: stats.correct,
            errorRate:
              stats.total > 0 ? (stats.total - stats.correct) / stats.total : 0,
            lastAttemptAt: new Date(),
          },
        }),
      ),
    );

    // Recalculate errorRate for all updated records
    const performances = await this.db.questionTypePerformance.findMany({
      where: { idUser: userId, skillType },
    });

    await this.db.$transaction(
      performances.map((p) =>
        this.db.questionTypePerformance.update({
          where: { id: p.id },
          data: {
            errorRate:
              p.totalAttempts > 0
                ? (p.totalAttempts - p.correctCount) / p.totalAttempts
                : 0,
          },
        }),
      ),
    );
  }

  async getWeakQuestionTypes(userId: string) {
    const performances = await this.db.questionTypePerformance.findMany({
      where: {
        idUser: userId,
        errorRate: { gte: 0.4 },
        totalAttempts: { gte: 3 },
      },
    });

    const weakTypes = performances.map((p) => ({
      skillType: p.skillType,
      questionType: p.questionType,
      errorRate: Math.round(p.errorRate * 100) / 100,
      totalAttempts: p.totalAttempts,
      tips: STRATEGY_TIPS[p.questionType] ?? [],
    }));

    return { weakTypes, status: 200 };
  }

  async getAllQuestionTypePerformance(userId: string) {
    const performances = await this.db.questionTypePerformance.findMany({
      where: { idUser: userId },
      orderBy: [{ skillType: 'asc' }, { questionType: 'asc' }],
    });

    const grouped = {
      READING: [] as any[],
      LISTENING: [] as any[],
    };

    for (const p of performances) {
      grouped[p.skillType as 'READING' | 'LISTENING'].push({
        questionType: p.questionType,
        totalAttempts: p.totalAttempts,
        correctCount: p.correctCount,
        errorRate: Math.round(p.errorRate * 100) / 100,
        lastAttemptAt: p.lastAttemptAt,
      });
    }

    return { data: grouped, status: 200 };
  }
}

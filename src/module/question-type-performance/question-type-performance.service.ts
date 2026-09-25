import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';

type SkillType = 'READING' | 'LISTENING' | 'WRITING' | 'SPEAKING';

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
  // Writing task types
  TASK1: [
    'Mô tả graph/chart rõ trend (increase/decrease/stable)',
    'Dùng so sánh (higher than, twice as much) + passive voice khi phù hợp',
  ],
  TASK2: [
    'Essay 250 words, 4-paragraph structure (intro, body 1, body 2, conclusion)',
    'Đưa ví dụ cụ thể + giải thích, không liệt kê ý chung chung',
  ],
  // Speaking parts
  PART1: [
    'Trả lời ngắn 2-3 câu, nói về bản thân/quen thuộc',
    'Tự nhiên, không cần ví dụ dài',
  ],
  PART2: [
    'Long turn 2 phút: who/what → details → why/how I feel',
    'Đề cập đủ cue card bullet points, không bỏ sót',
  ],
  PART3: [
    'Discussion abstract, đưa 2 viewpoints + opinion',
    'Dùng hedging (might, could, tend to) + examples',
  ],
};

const BAND_MAX = 9.0;

function normalizeErrorRate(raw: number, skillType: SkillType): number {
  // R/L: raw is already 0-1 fraction (wrong/total).
  // W/S: raw is avg band score 0-9 → convert to "error rate" via 1 - score/max.
  if (skillType === 'READING' || skillType === 'LISTENING') return raw;
  return 1 - raw / BAND_MAX;
}

@Injectable()
export class QuestionTypePerformanceService {
  constructor(private readonly db: DatabaseService) {}

  async trackQuestionTypePerformance(
    userId: string,
    testResultId: string,
    skillType: SkillType,
  ) {
    if (skillType === 'READING' || skillType === 'LISTENING') {
      await this.trackReadingListening(userId, testResultId, skillType);
    } else if (skillType === 'WRITING') {
      await this.trackWriting(userId, testResultId);
    } else if (skillType === 'SPEAKING') {
      await this.trackSpeaking(userId, testResultId);
    }
  }

  /**
   * Public HTTP entry for ai-grading-worker. Polls until all submissions for
   * the testResult reach a terminal grading state, then runs tracking.
   * Avoids duplicate calls within 10s.
   */
  async trackFromWorker(idUser: string, idTestResult: string, skillType: SkillType) {
    if (skillType !== 'WRITING' && skillType !== 'SPEAKING') {
      // Reading/Listening are tracked synchronously in submitReadingListeningTest;
      // workers should not call for those.
      return { skipped: true, reason: 'sync path' };
    }

    const deadline = Date.now() + 60_000; // 60s max wait
    while (Date.now() < deadline) {
      const ready = await this.allSubmissionsGraded(idTestResult, skillType);
      if (ready) break;
      await new Promise((r) => setTimeout(r, 2000));
    }
    await this.trackQuestionTypePerformance(idUser, idTestResult, skillType);
    return { ok: true };
  }

  private async allSubmissionsGraded(idTestResult: string, skillType: 'WRITING' | 'SPEAKING'): Promise<boolean> {
    if (skillType === 'WRITING') {
      const pending = await this.db.userWritingSubmission.count({
        where: { idTestResult, aiGradingStatus: { in: ['PENDING', 'GRADING'] } },
      });
      const total = await this.db.userWritingSubmission.count({ where: { idTestResult } });
      return total > 0 && pending === 0;
    }
    const pending = await this.db.userSpeakingSubmission.count({
      where: { idTestResult, aiGradingStatus: { in: ['PENDING', 'GRADING'] } },
    });
    const total = await this.db.userSpeakingSubmission.count({ where: { idTestResult } });
    return total > 0 && pending === 0;
  }

  /** Group userAnswer rows by answerType, upsert QuestionTypePerformance. */
  private async trackReadingListening(
    userId: string,
    testResultId: string,
    skillType: 'READING' | 'LISTENING',
  ) {
    const answers = await this.db.userAnswer.findMany({
      where: { idTestResult: testResultId, idUser: userId },
    });

    const grouped = new Map<string, { total: number; correct: number }>();
    for (const ans of answers) {
      const existing = grouped.get(ans.answerType) ?? { total: 0, correct: 0 };
      existing.total++;
      if (ans.isCorrect) existing.correct++;
      grouped.set(ans.answerType, existing);
    }

    await this.db.$transaction(
      Array.from(grouped.entries()).map(([questionType, stats]) =>
        this.db.questionTypePerformance.upsert({
          where: {
            idUser_skillType_questionType: { idUser: userId, skillType, questionType },
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
            errorRate: normalizeErrorRate(
              stats.total > 0 ? (stats.total - stats.correct) / stats.total : 0,
              skillType,
            ),
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
            errorRate: normalizeErrorRate(
              p.totalAttempts > 0
                ? (p.totalAttempts - p.correctCount) / p.totalAttempts
                : 0,
              skillType,
            ),
          },
        }),
      ),
    );
  }

  /** Group UserWritingSubmission by WritingTask.taskType (TASK1/TASK2), upsert. */
  private async trackWriting(userId: string, testResultId: string) {
    const submissions = await this.db.userWritingSubmission.findMany({
      where: { idTestResult: testResultId, idUser: userId, aiGradingStatus: 'COMPLETED' },
      include: { writingTask: { select: { taskType: true } } },
    });

    const grouped = new Map<string, { totalScore: number; count: number }>();
    for (const sub of submissions) {
      if (sub.aiOverallScore == null) continue;
      const key = sub.writingTask.taskType; // 'TASK1' | 'TASK2'
      const cur = grouped.get(key) ?? { totalScore: 0, count: 0 };
      cur.totalScore += sub.aiOverallScore;
      cur.count += 1;
      grouped.set(key, cur);
    }

    for (const [taskType, agg] of grouped.entries()) {
      const avgScore = agg.count > 0 ? agg.totalScore / agg.count : 0;
      const errRate = normalizeErrorRate(avgScore, 'WRITING');
      const existing = await this.db.questionTypePerformance.findUnique({
        where: {
          idUser_skillType_questionType: { idUser: userId, skillType: 'WRITING', questionType: taskType },
        },
      });
      const newTotalAttempts = (existing?.totalAttempts ?? 0) + agg.count;
      const newCorrectCount = Math.round((1 - errRate) * newTotalAttempts); // synthetic "correct" from error rate
      await this.db.questionTypePerformance.upsert({
        where: {
          idUser_skillType_questionType: { idUser: userId, skillType: 'WRITING', questionType: taskType },
        },
        update: {
          totalAttempts: { increment: agg.count },
          correctCount: { increment: Math.round((1 - errRate) * agg.count) },
          errorRate: errRate,
          lastAttemptAt: new Date(),
        },
        create: {
          idUser: userId,
          skillType: 'WRITING',
          questionType: taskType,
          totalAttempts: agg.count,
          correctCount: Math.round((1 - errRate) * agg.count),
          errorRate: errRate,
          lastAttemptAt: new Date(),
        },
      });
    }
  }

  /** Group UserSpeakingSubmission by SpeakingTask.part (PART1/PART2/PART3). */
  private async trackSpeaking(userId: string, testResultId: string) {
    const submissions = await this.db.userSpeakingSubmission.findMany({
      where: { idTestResult: testResultId, idUser: userId, aiGradingStatus: 'COMPLETED' },
      include: { speakingTask: { select: { part: true } } },
    });

    const grouped = new Map<string, { totalScore: number; count: number }>();
    for (const sub of submissions) {
      if (sub.aiOverallScore == null) continue;
      const key = sub.speakingTask.part; // 'PART1' | 'PART2' | 'PART3'
      const cur = grouped.get(key) ?? { totalScore: 0, count: 0 };
      cur.totalScore += sub.aiOverallScore;
      cur.count += 1;
      grouped.set(key, cur);
    }

    for (const [part, agg] of grouped.entries()) {
      const avgScore = agg.count > 0 ? agg.totalScore / agg.count : 0;
      const errRate = normalizeErrorRate(avgScore, 'SPEAKING');
      await this.db.questionTypePerformance.upsert({
        where: {
          idUser_skillType_questionType: { idUser: userId, skillType: 'SPEAKING', questionType: part },
        },
        update: {
          totalAttempts: { increment: agg.count },
          correctCount: { increment: Math.round((1 - errRate) * agg.count) },
          errorRate: errRate,
          lastAttemptAt: new Date(),
        },
        create: {
          idUser: userId,
          skillType: 'SPEAKING',
          questionType: part,
          totalAttempts: agg.count,
          correctCount: Math.round((1 - errRate) * agg.count),
          errorRate: errRate,
          lastAttemptAt: new Date(),
        },
      });
    }
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

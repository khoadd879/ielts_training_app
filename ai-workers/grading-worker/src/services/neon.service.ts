import { PrismaClient } from '@prisma/client';

const GRAMMAR_TOPIC_IDS: Record<string, string> = {
  'subject_verb': 'Subject-Verb Agreement',
  'verb_tenses': 'Verb Tenses',
  'articles': 'Articles (a/an/the)',
  'prepositions': 'Prepositions',
  'conditionals': 'Conditionals',
  'passive_voice': 'Passive Voice',
  'relative_clauses': 'Relative Clauses',
  'sentence_structure': 'Sentence Structure',
  'word_forms': 'Word Forms',
  'connectors': 'Connectors/Coherence',
};

export interface GrammarViolation {
  topicId: string;
  userSentence: string;
  correctedSentence: string;
  explanation?: string;
}

export class NeonService {
  private prisma: PrismaClient;

  constructor(connectionString: string) {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: connectionString,
        },
      },
    });
  }

  async updateWritingSubmission(
    submissionId: string,
    data: {
      aiGradingStatus: 'COMPLETED' | 'FAILED';
      aiOverallScore: number;
      aiDetailedFeedback: any;
      gradedAt: Date;
    },
  ): Promise<void> {
    await this.prisma.userWritingSubmission.update({
      where: { idWritingSubmission: submissionId },
      data,
    });
  }

  async updateSpeakingSubmission(
    submissionId: string,
    data: {
      aiGradingStatus: 'COMPLETED' | 'FAILED';
      transcript?: string;
      aiOverallScore: number;
      aiDetailedFeedback: any;
      gradedAt: Date;
    },
  ): Promise<void> {
    await this.prisma.userSpeakingSubmission.update({
      where: { idSpeakingSubmission: submissionId },
      data,
    });
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }

  async getWritingSubmissionWithRefund(submissionId: string) {
    return this.prisma.userWritingSubmission.findUnique({
      where: { idWritingSubmission: submissionId },
      select: {
        idUser: true,
        idCreditTransaction: true,
      },
    });
  }

  /**
   * After the worker finishes grading a single writing submission, check if all
   * submissions for its testResult are now in a terminal state. If yes, aggregate
   * their scores and update UserTestResult.bandScore.
   *
   * IELTS Writing formula (matches user-test-result.service.ts before this fix):
   *   rawScore  = (task1 + task2 * 2) / 3
   *   bandScore = round(rawScore * 2) / 2   (nearest 0.5)
   *
   * FAILED submissions contribute 0 (mirrors the original `submittedCount` semantics).
   *
   * Idempotent: safe to call multiple times for the same submissionId.
   */
  async aggregateTestResultIfReady(submissionId: string): Promise<void> {
    const sub = await this.prisma.userWritingSubmission.findUnique({
      where: { idWritingSubmission: submissionId },
      select: { idTestResult: true },
    });
    if (!sub?.idTestResult) return;

    const submissions = await this.prisma.userWritingSubmission.findMany({
      where: { idTestResult: sub.idTestResult },
      select: {
        aiGradingStatus: true,
        aiOverallScore: true,
        writingTask: { select: { taskType: true } },
      },
    });

    if (submissions.length === 0) return;

    const allDone = submissions.every(
      (s) =>
        s.aiGradingStatus === 'COMPLETED' || s.aiGradingStatus === 'FAILED',
    );
    if (!allDone) return;

    let scoreTask1 = 0;
    let scoreTask2 = 0;
    for (const s of submissions) {
      const score =
        s.aiGradingStatus === 'COMPLETED' ? s.aiOverallScore ?? 0 : 0;
      if (s.writingTask.taskType === 'TASK1') scoreTask1 = score;
      else if (s.writingTask.taskType === 'TASK2') scoreTask2 = score;
    }
    const rawScore = (scoreTask1 + scoreTask2 * 2) / 3;
    const bandScore = Math.round(rawScore * 2) / 2;

    await this.prisma.userTestResult.update({
      where: { idTestResult: sub.idTestResult },
      data: { bandScore },
    });
  }

  /**
   * Speaking counterpart of aggregateTestResultIfReady. Equal-weighted
   * average of per-submission aiOverallScore across all 3 parts
   * (PART1/PART2/PART3). FAILED contributes 0 (mirrors writing behavior).
   * Idempotent.
   */
  async aggregateSpeakingTestResultIfReady(submissionId: string): Promise<void> {
    const sub = await this.prisma.userSpeakingSubmission.findUnique({
      where: { idSpeakingSubmission: submissionId },
      select: { idTestResult: true },
    });
    if (!sub?.idTestResult) return;

    const submissions = await this.prisma.userSpeakingSubmission.findMany({
      where: { idTestResult: sub.idTestResult },
      select: {
        aiGradingStatus: true,
        aiOverallScore: true,
        speakingTask: { select: { part: true } },
      },
    });

    if (submissions.length === 0) return;

    const allDone = submissions.every(
      (s) =>
        s.aiGradingStatus === 'COMPLETED' || s.aiGradingStatus === 'FAILED',
    );
    if (!allDone) return;

    let sum = 0;
    let count = 0;
    for (const s of submissions) {
      const score =
        s.aiGradingStatus === 'COMPLETED' ? s.aiOverallScore ?? 0 : 0;
      sum += score;
      count++;
    }
    const rawScore = count > 0 ? sum / count : 0;
    const bandScore = Math.round(rawScore * 2) / 2;

    await this.prisma.userTestResult.update({
      where: { idTestResult: sub.idTestResult },
      data: { bandScore },
    });
  }

  async getSpeakingSubmissionWithRefund(submissionId: string) {
    return this.prisma.userSpeakingSubmission.findUnique({
      where: { idSpeakingSubmission: submissionId },
      select: {
        idUser: true,
        idCreditTransaction: true,
      },
    });
  }

  async refundCredits(idUser: string, creditsAmount: number, idWritingSubmission?: string, idSpeakingSubmission?: string): Promise<void> {
    // Find and cancel original transaction
    const filter = idWritingSubmission
      ? { idWritingSubmission }
      : { idSpeakingSubmission };

    const originalTx = await this.prisma.creditTransaction.findFirst({
      where: {
        ...filter,
        transactionType: idWritingSubmission ? 'USED_WRITING' : 'USED_SPEAKING',
      },
    });

    if (originalTx) {
      // Cancel original transaction
      await this.prisma.creditTransaction.update({
        where: { idTransaction: originalTx.idTransaction },
        data: { status: 'CANCELLED' },
      });

      // Create refund transaction
      await this.prisma.creditTransaction.create({
        data: {
          idUser,
          creditsAmount: originalTx.creditsAmount,
          transactionType: 'REFUND',
          idWritingSubmission,
          idSpeakingSubmission,
          description: `Refund for failed ${idWritingSubmission ? 'writing' : 'speaking'} grading`,
          status: 'COMPLETED',
        },
      });

      // Restore balance
      const balance = await this.prisma.creditBalance.findUnique({
        where: { idUser },
      });

      if (balance) {
        await this.prisma.creditBalance.update({
          where: { idUser },
          data: {
            usedCredits: Math.max(0, balance.usedCredits - originalTx.creditsAmount),
          },
        });
      }
    }
  }

  async refundSubscriptionQuota(idUser: string, refundAmount: number): Promise<void> {
    const sub = await this.prisma.userSubscription.findFirst({
      where: { idUser, status: 'ACTIVE' },
    });

    if (sub && sub.creditsUsedThisPeriod > 0) {
      await this.prisma.userSubscription.update({
        where: { idSubscription: sub.idSubscription },
        data: {
          creditsUsedThisPeriod: Math.max(0, sub.creditsUsedThisPeriod - refundAmount),
        },
      });
    }
  }

  async saveGrammarViolations(
    userId: string,
    source: 'WRITING' | 'SPEAKING',
    submissionId: string,
    grammarViolations: GrammarViolation[],
  ): Promise<void> {
    for (const v of grammarViolations) {
      const topicTitle = GRAMMAR_TOPIC_IDS[v.topicId];
      if (!topicTitle) continue;

      // Find grammar id by title
      const grammar = await this.prisma.grammar.findFirst({
        where: { title: { contains: topicTitle.split(' ')[0] } },
      });

      if (!grammar) continue;

      // Create violation record
      await this.prisma.userGrammarViolation.create({
        data: {
          idUser: userId,
          source,
          idGrammar: grammar.idGrammar,
          submissionId,
          userSentence: v.userSentence,
          correctedSentence: v.correctedSentence,
        },
      });

      // Update proficiency wrong count
      await this.prisma.userGrammarProficiency.upsert({
        where: { idUser_idGrammar: { idUser: userId, idGrammar: grammar.idGrammar } },
        update: { wrongCount: { increment: 1 } },
        create: {
          idUser: userId,
          idGrammar: grammar.idGrammar,
          proficiency: 'unknown',
          wrongCount: 1,
          totalAttempts: 1,
        },
      });
    }
  }
}

export function createNeonService(): NeonService {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }
  return new NeonService(connectionString);
}
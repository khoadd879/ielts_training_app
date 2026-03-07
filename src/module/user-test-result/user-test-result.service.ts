import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { StreakService } from '../streak-service/streak-service.service';
import {
  Level,
  TestStatus,
  TestType,
  WritingTaskType,
  SpeakingPartType,
} from '@prisma/client';
import { UserWritingSubmissionService } from '../user-writing-submission/user-writing-submission.service';
import { UserSpeakingSubmissionService } from '../user-speaking-submission/user-speaking-submission.service';
import { FinishTestWritingDto } from './dto/finish-test-writing.dto';
import { FinishTestSpeakingDto } from './dto/finish-test-speaking.dto';

export interface SubmissionDetail {
  idWritingTask: string;
  taskType: string;
  submissionText: string;
  aiDetailedFeedback: any;
  score: number;
}

@Injectable()
export class UserTestResultService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly streakService: StreakService,
    private readonly writingService: UserWritingSubmissionService,
    private readonly speakingService: UserSpeakingSubmissionService,
  ) {}

  async findAllTestResultByIdUser(idUser: string) {
    const existingUser = await this.databaseService.user.findUnique({
      where: {
        idUser,
      },
    });

    if (!existingUser) throw new BadRequestException('User not found');

    const data = await this.databaseService.userTestResult.findMany({
      where: { idUser, status: TestStatus.FINISHED },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        test: true,
        userAnswers: true,
      },
    });

    return {
      message: 'Test result retrieved successfully',
      data,
      status: 200,
    };
  }

  async findOne(idTestResult: string) {
    const data = await this.databaseService.userTestResult.findUnique({
      where: { idTestResult },
    });

    if (!data) throw new BadRequestException('Test result not found');

    return {
      message: 'Test result retrieved successfully',
      data,
      status: 200,
    };
  }

  async deleteTestResult(idTestResult: string) {
    const existingTestResult =
      await this.databaseService.userTestResult.findUnique({
        where: {
          idTestResult,
        },
      });

    if (!existingTestResult)
      throw new BadRequestException('Test result not found');

    await this.databaseService.userTestResult.delete({
      where: {
        idTestResult,
      },
    });

    return {
      message: 'Test result deleted successfully',
      status: 200,
    };
  }

  async startTest(idUser: string, idTest: string) {
    const existingUser = await this.databaseService.user.findUnique({
      where: { idUser },
    });
    if (!existingUser) throw new BadRequestException('User not found');

    const existingTest = await this.databaseService.test.findUnique({
      where: { idTest },
    });
    if (!existingTest) throw new BadRequestException('Test not found');

    const testResult = await this.databaseService.userTestResult.create({
      data: {
        idUser,
        idTest,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
    });

    return {
      message: 'Test started',
      status: 200,
      data: testResult,
    };
  }

  async resetTest(idTestResult: string) {
    const result = await this.databaseService.$transaction(async (tx) => {
      const deletedAnswers = await tx.userAnswer.deleteMany({
        where: { idTestResult },
      });
      await tx.userTestResult.delete({ where: { idTestResult } });
      return deletedAnswers.count;
    });

    return {
      message: `Test reset successfully, deleted ${result} answers`,
      status: 200,
    };
  }

  async finishTest(idTestResult: string, idUser: string) {
    // 1. Validate user exists
    await this.validateUser(idUser);

    // 2. Get test result with all related data
    const testResult = await this.getTestResultWithDetails(
      idTestResult,
      idUser,
    );

    // 3. Validate test is in progress
    this.validateTestInProgress(testResult);

    // 4. Get all questions from the test
    const allQuestions = this.extractAllQuestions(testResult);

    // 5. Grade all user answers (calculate BEFORE transaction to minimize lock time)
    const gradingResults = await this.gradeAllAnswers(
      testResult.userAnswers,
      allQuestions,
    );

    // 6. Calculate scores (BEFORE transaction)
    const { totalCorrect, bandScore } = this.calculateScores(
      gradingResults,
      allQuestions.length,
    );

    // 7. Calculate XP (with anti-spam check - BEFORE transaction)
    const xpGained = await this.calculateXpGained(
      idUser,
      testResult.idTest,
      idTestResult,
      testResult.test.level,
      bandScore,
    );

    // 8. Pre-calculate user level changes if XP will be gained
    let userLevelUpdate: {
      newXp: number;
      currentLevel: string;
      xpToNext: number;
    } | null = null;
    if (xpGained > 0) {
      const user = await this.databaseService.user.findUnique({
        where: { idUser },
      });
      if (user) {
        let newXp = user.xp + xpGained;
        let currentLevel = user.level ?? 'Low';
        let xpToNext = user.xpToNext ?? 100;

        while (newXp >= xpToNext) {
          newXp -= xpToNext;
          currentLevel = this.getNextLevel(currentLevel as any);
          xpToNext = this.updateXpToNext(currentLevel as any);
        }
        userLevelUpdate = { newXp, currentLevel, xpToNext };
      }
    }

    // 9. Wrap all state changes in a transaction for atomicity
    const updatedResult = await this.databaseService.$transaction(
      async (tx) => {
        // Update user XP and level if gained
        if (userLevelUpdate) {
          await tx.user.update({
            where: { idUser },
            data: {
              xp: userLevelUpdate.newXp,
              level: userLevelUpdate.currentLevel as any,
              xpToNext: userLevelUpdate.xpToNext,
            },
          });
        }

        // Update test completion status
        const result = await tx.userTestResult.update({
          where: { idTestResult: idTestResult },
          data: {
            status: 'FINISHED',
            finishedAt: new Date(),
            totalCorrect: totalCorrect,
            totalQuestions: allQuestions.length,
            bandScore: bandScore,
            score: totalCorrect,
          },
        });

        return result;
      },
    );

    // 10. Update streak AFTER transaction (non-critical, can fail independently)
    try {
      await this.streakService.updateStreak(idUser);
    } catch (error) {
      console.error(`Failed to update streak for user ${idUser}`, error);
    }

    return {
      message: 'Test finished successfully!',
      data: {
        xpGained,
        bandScore,
        totalCorrect,
        totalQuestions: allQuestions.length,
        finishedAt: updatedResult.finishedAt,
      },
      status: 200,
    };
  }

  private async validateUser(idUser: string) {
    const existingUser = await this.databaseService.user.findUnique({
      where: { idUser },
    });
    if (!existingUser) throw new BadRequestException('User not found');
  }

  private async getTestResultWithDetails(idTestResult: string, idUser: string) {
    const testResult = await this.databaseService.userTestResult.findFirst({
      where: {
        idTestResult: idTestResult,
        idUser: idUser,
      },
      select: {
        idTestResult: true,
        idUser: true,
        idTest: true,
        status: true,
        startedAt: true,
        finishedAt: true,
        userAnswers: {
          select: {
            idUserAnswer: true,
            idQuestion: true,
            answerType: true,
            answerPayload: true,
            isCorrect: true,
          },
        },
        test: {
          select: {
            idTest: true,
            level: true,
            parts: {
              select: {
                idPart: true,
                questionGroups: {
                  select: {
                    idQuestionGroup: true,
                    questionType: true,
                    questions: {
                      select: {
                        idQuestion: true,
                        questionNumber: true,
                        questionType: true,
                        content: true,
                        metadata: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!testResult) {
      throw new NotFoundException(
        'Test result not found or you do not have permission.',
      );
    }

    return testResult;
  }

  private validateTestInProgress(testResult: any) {
    if (testResult.status !== 'IN_PROGRESS') {
      throw new BadRequestException('This test is not in progress.');
    }
  }

  private extractAllQuestions(testResult: any) {
    return testResult.test.parts
      .flatMap((p) => p.questionGroups)
      .flatMap((g) => g.questions);
  }

  private async gradeAllAnswers(userAnswers: any[], allQuestions: any[]) {
    // ✅ OPTIMIZED: Collect grading results first, then batch update
    const gradingResults: Array<{
      idUserAnswer: string;
      isCorrect: boolean;
      score: number;
      needsUpdate: boolean;
    }> = [];

    // Grade all answers without database updates
    for (const uAnswer of userAnswers) {
      const questionData = allQuestions.find(
        (q) => q.idQuestion === uAnswer.idQuestion,
      );

      if (!questionData) {
        gradingResults.push({
          idUserAnswer: uAnswer.idUserAnswer,
          isCorrect: false,
          score: 0,
          needsUpdate: uAnswer.isCorrect !== false,
        });
        continue;
      }

      const isCorrect = this.gradeUserAnswer(uAnswer, questionData);
      gradingResults.push({
        idUserAnswer: uAnswer.idUserAnswer,
        isCorrect,
        score: isCorrect ? 1 : 0,
        needsUpdate: uAnswer.isCorrect !== isCorrect,
      });
    }

    // ✅ Batch update all answers that need updating in one transaction
    const answersToUpdate = gradingResults.filter((r) => r.needsUpdate);

    if (answersToUpdate.length > 0) {
      await this.databaseService.$transaction(
        answersToUpdate.map((answer) =>
          this.databaseService.userAnswer.update({
            where: { idUserAnswer: answer.idUserAnswer },
            data: { isCorrect: answer.isCorrect },
          }),
        ),
      );
    }

    // Return scores
    return gradingResults.map((r) => r.score);
  }

  /**
   * Grade a single user answer against the question's metadata.
   * The metadata JSONB contains all correct answers per question type.
   */
  private gradeUserAnswer(uAnswer: any, questionData: any): boolean {
    const metadata = questionData.metadata as any;
    if (!metadata) return false;

    const answerPayload = uAnswer.answerPayload as any;
    if (!answerPayload) return false;

    const qType = questionData.questionType;

    switch (qType) {
      case 'MULTIPLE_CHOICE':
        return this.gradeMCQ(answerPayload, metadata);

      case 'TRUE_FALSE_NOT_GIVEN':
      case 'YES_NO_NOT_GIVEN':
        return this.gradeTFNG(answerPayload, metadata);

      case 'MATCHING_HEADING':
        return this.gradeMatchingHeading(answerPayload, metadata);

      case 'MATCHING_INFORMATION':
        return this.gradeMatchingInformation(answerPayload, metadata);

      case 'MATCHING_FEATURES':
        return this.gradeMatchingFeatures(answerPayload, metadata);

      case 'MATCHING_SENTENCE_ENDINGS':
        return this.gradeMatchingSentenceEndings(answerPayload, metadata);

      case 'SENTENCE_COMPLETION':
      case 'SUMMARY_COMPLETION':
      case 'NOTE_COMPLETION':
      case 'TABLE_COMPLETION':
      case 'FLOW_CHART_COMPLETION':
      case 'SHORT_ANSWER':
        return this.gradeFillIn(answerPayload, metadata);

      case 'DIAGRAM_LABELING':
        return this.gradeFillIn(answerPayload, metadata);

      default:
        return false;
    }
  }

  private gradeMCQ(payload: any, metadata: any): boolean {
    const correctIndexes: number[] = metadata.correctOptionIndexes ?? [];
    const selectedIndexes: number[] = payload.selectedIndexes ?? [];

    if (correctIndexes.length === 0 || selectedIndexes.length === 0) return false;
    if (correctIndexes.length !== selectedIndexes.length) return false;

    const sortedCorrect = [...correctIndexes].sort();
    const sortedSelected = [...selectedIndexes].sort();
    return sortedCorrect.every((v, i) => v === sortedSelected[i]);
  }

  private gradeTFNG(payload: any, metadata: any): boolean {
    const correctAnswer = metadata.correctAnswer?.toUpperCase()?.trim();
    const userAnswer = payload.answer?.toUpperCase()?.trim();
    return correctAnswer === userAnswer;
  }

  private gradeMatchingHeading(payload: any, metadata: any): boolean {
    const correctIndex = metadata.correctHeadingIndex;
    const headings = metadata.headings ?? [];
    if (correctIndex == null || !headings[correctIndex]) return false;

    const selectedLabel = payload.selectedLabel?.trim()?.toUpperCase();
    const correctLabel = headings[correctIndex]?.label?.trim()?.toUpperCase();
    return selectedLabel === correctLabel;
  }

  private gradeMatchingInformation(payload: any, metadata: any): boolean {
    const correctParagraph = metadata.correctParagraph?.trim()?.toUpperCase();
    const selectedLabel = payload.selectedLabel?.trim()?.toUpperCase();
    return correctParagraph === selectedLabel;
  }

  private gradeMatchingFeatures(payload: any, metadata: any): boolean {
    const correctLabel = metadata.correctFeatureLabel?.trim()?.toUpperCase();
    const selectedLabel = payload.selectedLabel?.trim()?.toUpperCase();
    return correctLabel === selectedLabel;
  }

  private gradeMatchingSentenceEndings(payload: any, metadata: any): boolean {
    const correctLabel = metadata.correctEndingLabel?.trim()?.toUpperCase();
    const selectedLabel = payload.selectedLabel?.trim()?.toUpperCase();
    return correctLabel === selectedLabel;
  }

  private gradeFillIn(payload: any, metadata: any): boolean {
    const correctAnswers: string[] = metadata.correctAnswers ?? [];
    const userText = payload.answerText?.trim();
    if (!userText) return false;

    const normalizedUser = this.normalizeText(userText);
    return correctAnswers.some(
      (correct) => this.normalizeText(correct) === normalizedUser,
    );
  }

  private normalizeText(text: string): string {
    return text.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  /**
   * Update answer correctness in database if changed
   */
  private async updateAnswerCorrectness(uAnswer: any, isCorrect: boolean) {
    if (uAnswer.isCorrect !== isCorrect) {
      await this.databaseService.userAnswer.update({
        where: { idUserAnswer: uAnswer.idUserAnswer },
        data: { isCorrect: isCorrect },
      });
    }
  }

  /**
   * Calculate total correct and band score
   */
  private calculateScores(gradingResults: number[], totalQuestions: number) {
    const totalCorrect = gradingResults.reduce((sum, val) => sum + val, 0);
    const bandScore = this.calculateIELTSBandScore(
      totalCorrect,
      totalQuestions,
    );

    return { totalCorrect, bandScore };
  }

  /**
   * Calculate XP with anti-spam check
   */
  private async calculateXpGained(
    idUser: string,
    idTest: string,
    currentTestResultId: string,
    level: 'Low' | 'Mid' | 'High' | 'Great',
    bandScore: number,
  ): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const alreadyCompletedToday =
      await this.databaseService.userTestResult.findFirst({
        where: {
          idUser: idUser,
          idTest: idTest,
          status: 'FINISHED',
          finishedAt: { gte: today },
          idTestResult: { not: currentTestResultId },
        },
      });

    // Only award XP if this is the first completion today
    return alreadyCompletedToday ? 0 : this.calculateXp(level, bandScore);
  }

  /**
   * Handle XP and streak updates
   */
  private async handleXpAndStreak(idUser: string, xpGained: number) {
    // Update XP if gained
    if (xpGained > 0) {
      await this.updateUserXpAndLevel(idUser, xpGained);
    }

    // Update streak
    try {
      await this.streakService.updateStreak(idUser);
    } catch (error) {
      console.error(`Failed to update streak for user ${idUser}`, error);
    }
  }

  /**
   * Update test completion status
   */
  private async updateTestCompletion(
    idTestResult: string,
    totalCorrect: number,
    totalQuestions: number,
    bandScore: number,
  ) {
    return await this.databaseService.userTestResult.update({
      where: { idTestResult: idTestResult },
      data: {
        status: 'FINISHED',
        finishedAt: new Date(),
        totalCorrect: totalCorrect,
        totalQuestions: totalQuestions,
        bandScore: bandScore,
        score: totalCorrect,
      },
    });
  }

  /**
   * Hàm tính XP dựa trên level và band score
   * - Low: hệ số 1.0
   * - Mid: hệ số 1.5
   * - High: hệ số 2.0
   */
  private calculateXp(
    level: 'Low' | 'Mid' | 'High' | 'Great',
    band: number,
  ): number {
    const levelMultiplier = level === 'Low' ? 1 : level === 'Mid' ? 1.5 : 2.0;

    const xp = Math.max(0, (band - 5) * 10 * levelMultiplier);
    return Math.round(xp);
  }

  /**
   * Cập nhật XP của user và kiểm tra nếu đủ để lên level mới
   */
  private async updateUserXpAndLevel(userId: string, xpGained: number) {
    const user = await this.databaseService.user.findUnique({
      where: { idUser: userId },
    });

    if (!user) return;

    let newXp = user.xp + xpGained;
    let currentLevel = user.level ?? 'Low';
    let xpToNext = user.xpToNext ?? 100;

    while (newXp >= xpToNext) {
      newXp -= xpToNext;
      currentLevel = this.getNextLevel(currentLevel);
      xpToNext = this.updateXpToNext(currentLevel);
    }

    await this.databaseService.user.update({
      where: { idUser: userId },
      data: {
        xp: newXp,
        level: currentLevel,
        xpToNext,
      },
    });
  }

  /**
   * Trả về level tiếp theo
   */
  private getNextLevel(level: 'Low' | 'Mid' | 'High' | 'Great') {
    switch (level) {
      case 'Low':
        return 'Mid';
      case 'Mid':
        return 'High';
      case 'High':
        return 'Great';
      default:
        return 'Great';
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

  async findAllTestResults() {
    const data = await this.databaseService.userTestResult.findMany({
      include: {
        user: {
          select: {
            idUser: true,
            nameUser: true,
            avatar: true,
          },
        },
        test: true,
      },
    });
    return {
      message: 'Test results retrieved successfully',
      data,
      status: 200,
    };
  }

  private calculateIELTSBandScore(correct: number, total: number): number {
    if (total !== 40) {
      // Fallback nếu đề không phải chuẩn 40 câu
      return Math.round((correct / total) * 9 * 2) / 2;
    }

    // Thang điểm tham khảo IELTS Listening
    if (correct >= 39) return 9.0;
    if (correct >= 37) return 8.5;
    if (correct >= 35) return 8.0;
    if (correct >= 32) return 7.5;
    if (correct >= 30) return 7.0;
    if (correct >= 26) return 6.5;
    if (correct >= 23) return 6.0;
    if (correct >= 18) return 5.5;
    if (correct >= 16) return 5.0;
    if (correct >= 13) return 4.5;
    if (correct >= 10) return 4.0;
    if (correct >= 8) return 3.5;
    if (correct >= 6) return 3.0;
    if (correct >= 4) return 2.5;
    if (correct >= 2) return 2.0;
    if (correct >= 1) return 1.0;
    return 0.0;
  }

  async getAllAnswerInTestResult(idTestResult: string) {
    const testInfo = await this.databaseService.userTestResult.findUnique({
      where: { idTestResult },
      select: {
        test: {
          select: {
            testType: true,
          },
        },
      },
    });

    let data: any;

    if (testInfo?.test.testType === TestType.WRITING) {
      data = await this.databaseService.userTestResult.findUnique({
        where: { idTestResult, status: TestStatus.FINISHED },
        include: {
          test: {
            include: {
              writingTasks: {
                orderBy: {
                  taskType: 'asc',
                },
              },
            },
          },
          writingSubmissions: true,
        },
      });
    } else if (testInfo?.test.testType === TestType.SPEAKING) {
      data = await this.databaseService.userTestResult.findUnique({
        where: {
          idTestResult,
          status: TestStatus.FINISHED,
        },
        include: {
          test: {
            include: {
              speakingTasks: {
                include: {
                  questions: true,
                },
                orderBy: {
                  part: 'asc',
                },
              },
            },
          },
          speakingSubmissions: true,
        },
      });
    } else {
      data = await this.databaseService.userTestResult.findFirst({
        where: {
          idTestResult: idTestResult,
          status: TestStatus.FINISHED,
        },
        orderBy: {
          updatedAt: 'desc',
        },
        include: {
          userAnswers: true,
          test: {
            include: {
              parts: {
                orderBy: { order: 'asc' },
                include: {
                  passage: true,
                  questionGroups: {
                    orderBy: { order: 'asc' },
                    include: {
                      questions: {
                        orderBy: { order: 'asc' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });
    }
    if (!data) throw new NotFoundException('Test result not found');

    return {
      message: 'Test result and answers retrieved successfully',
      data,
      status: 200,
    };
  }

  async finishTestWriting(
    idTestResult: string,
    idUser: string,
    body?: FinishTestWritingDto,
  ) {
    const testResult = await this.databaseService.userTestResult.findUnique({
      where: { idTestResult },
      include: { test: true },
    });

    if (!testResult) throw new NotFoundException('Test result not found');
    if (testResult.idUser !== idUser) {
      throw new BadRequestException(
        'You do not have permission to finish this test',
      );
    }
    if (testResult.status !== 'IN_PROGRESS') {
      throw new BadRequestException('This test is not in progress.');
    }
    if (testResult.test.testType !== TestType.WRITING) {
      throw new BadRequestException('This endpoint is for Writing tests only.');
    }

    let scoreTask1 = 0;
    let scoreTask2 = 0;
    let submittedCount = 0;
    const submissionsDetails: SubmissionDetail[] = [];

    if (body?.writingSubmissions && body.writingSubmissions.length > 0) {
      // ✅ OPTIMIZATION 1: Prefetch all writing tasks in one query (avoid N+1)
      const taskIds = body.writingSubmissions
        .filter((s) => s.submissionText?.trim())
        .map((s) => s.idWritingTask);

      const tasks = await this.databaseService.writingTask.findMany({
        where: { idWritingTask: { in: taskIds } },
        select: { idWritingTask: true, taskType: true },
      });
      const taskMap = new Map(tasks.map((t) => [t.idWritingTask, t]));

      // ✅ OPTIMIZATION 2: Parallel AI grading (instead of sequential)
      const gradingPromises = body.writingSubmissions
        .filter((s) => s.submissionText?.trim())
        .map(async (submission) => {
          const taskInfo = taskMap.get(submission.idWritingTask);
          if (!taskInfo) return null;

          try {
            // Gọi AI chấm điểm
            const result =
              await this.writingService.createUserWritingSubmission(
                idTestResult,
                {
                  idUser: idUser,
                  idWritingTask: submission.idWritingTask,
                  submissionText: submission.submissionText,
                },
              );

            return {
              taskInfo,
              result,
            };
          } catch (error) {
            console.error(
              `Failed to grade task ${submission.idWritingTask}:`,
              error,
            );
            throw error; // Re-throw to fail the entire submission if one task fails
          }
        });

      // Wait for all AI grading to complete in parallel
      const gradedResults = await Promise.all(gradingPromises);

      // ✅ OPTIMIZATION 3: Process results efficiently
      for (const item of gradedResults) {
        if (!item) continue;
        const { taskInfo, result } = item;

        submittedCount++;

        submissionsDetails.push({
          idWritingTask: taskInfo.idWritingTask,
          taskType: taskInfo.taskType,
          submissionText: result.submissionText,
          aiDetailedFeedback: result.aiDetailedFeedback,
          score: result.score,
        });

        if (taskInfo.taskType === WritingTaskType.TASK1) {
          scoreTask1 = result.score;
        } else if (taskInfo.taskType === WritingTaskType.TASK2) {
          scoreTask2 = result.score;
        } else {
          scoreTask1 += result.score;
        }
      }
    }

    let rawScore = (scoreTask1 + scoreTask2 * 2) / 3;

    let bandScore = Math.round(rawScore * 2) / 2;

    const xpGained = await this.calculateXpGained(
      idUser,
      testResult.idTest,
      idTestResult,
      testResult.test.level,
      bandScore,
    );

    await this.handleXpAndStreak(idUser, xpGained);

    const updatedResult = await this.databaseService.userTestResult.update({
      where: { idTestResult },
      data: {
        status: 'FINISHED',
        finishedAt: new Date(),
        bandScore: bandScore,
        totalQuestions: submittedCount,
      },
    });

    return {
      message: 'Writing test finished and graded successfully!',
      data: {
        idTestResult,
        xpGained,
        bandScore,
        breakdown: {
          task1Score: scoreTask1,
          task2Score: scoreTask2,
        },
        submissions: submissionsDetails,
        finishedAt: updatedResult.finishedAt,
        submissionsCount: submittedCount,
      },
      status: 200,
    };
  }

  async finishTestSpeaking(
    idTestResult: string,
    idUser: string,
    files: {
      part1Audio?: Express.Multer.File[];
      part2Audio?: Express.Multer.File[];
      part3Audio?: Express.Multer.File[];
    },
    body?: FinishTestSpeakingDto, // Nếu có logic gì thêm từ body
  ) {
    // 1. Validate và lấy thông tin Test kèm theo SpeakingTasks
    const testResult = await this.databaseService.userTestResult.findUnique({
      where: { idTestResult },
      include: {
        test: {
          include: {
            speakingTasks: true,
            _count: {
              select: {
                speakingTasks: true,
              },
            },
          },
        },
      },
    });

    if (!testResult) throw new NotFoundException('Test result not found');
    if (testResult.idUser !== idUser) {
      throw new BadRequestException(
        'You do not have permission to finish this test',
      );
    }
    if (testResult.status !== 'IN_PROGRESS') {
      throw new BadRequestException('This test is not in progress.');
    }
    if (testResult.test.testType !== TestType.SPEAKING) {
      throw new BadRequestException(
        'This endpoint is for Speaking tests only.',
      );
    }

    const tasks = testResult.test.speakingTasks;
    if (!tasks || tasks.length === 0) {
      throw new BadRequestException(
        'This test configuration is missing speaking tasks.',
      );
    }

    const partScores = [
      { part: SpeakingPartType.PART1, score: 0 },
      { part: SpeakingPartType.PART2, score: 0 },
      { part: SpeakingPartType.PART3, score: 0 },
    ];
    const submissionsDetails: any[] = [];

    const processPart = async (
      partType: SpeakingPartType,
      audioFiles?: Express.Multer.File[],
    ) => {
      const task = tasks.find((t) => t.part === partType);

      if (audioFiles && audioFiles.length > 0 && task) {
        const result = await this.speakingService.create(
          {
            idUser,
            idSpeakingTask: task.idSpeakingTask,
            idTestResult,
            audioUrl: '', // Service upload sẽ xử lý cái này
          },
          audioFiles[0], // File audio
        );

        const score = (result.data?.aiDetailedFeedback as any)?.overallScore || result.data?.aiOverallScore || 0;

        const partIndex = partScores.findIndex((p) => p.part === partType);
        if (partIndex !== -1) {
          partScores[partIndex].score = score;
        }

        submissionsDetails.push({
          part: partType,
          idSpeakingSubmission: result.data?.idSpeakingSubmission,
          audioUrl: result.data?.audioUrl,
          transcript: result.data?.transcript,
          aiDetailedFeedback: result.data?.aiDetailedFeedback,
          score,
        });
      }
    };

    await Promise.all([
      processPart('PART1', files.part1Audio),
      processPart('PART2', files.part2Audio),
      processPart('PART3', files.part3Audio),
    ]);

    const totalScore = partScores.reduce((sum, p) => sum + p.score, 0);
    const submittedPartsCount = submissionsDetails.length;
    let bandScore: number;

    const totalTasks = testResult.test._count.speakingTasks;

    if (totalTasks > 0) {
      bandScore = Math.round((totalScore / totalTasks) * 2) / 2;
    } else {
      bandScore = 0;
    }

    const xpGained = await this.calculateXpGained(
      idUser,
      testResult.idTest,
      idTestResult,
      testResult.test.level,
      bandScore,
    );

    // 5. Update Streak & XP
    await this.handleXpAndStreak(idUser, xpGained);

    // 6. Update Test Result Status
    const updatedResult = await this.databaseService.userTestResult.update({
      where: { idTestResult },
      data: {
        status: 'FINISHED',
        finishedAt: new Date(),
        bandScore: bandScore,
        totalQuestions: submittedPartsCount,
      },
    });

    return {
      message: 'Speaking test finished and graded successfully!',
      data: {
        idTestResult,
        xpGained,
        bandScore,
        breakdown: partScores.reduce(
          (acc, p) => {
            acc[p.part] = p.score;
            return acc;
          },
          {} as Record<string, number>,
        ),
        submissions: submissionsDetails,
        finishedAt: updatedResult.finishedAt,
        submissionsCount: submittedPartsCount,
      },
      status: 200,
    };
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { StreakService } from '../streak-service/streak-service.service';
import { Level, TestStatus, TestType, WritingTaskType, SpeakingPartType } from '@prisma/client';
import { UserWritingSubmissionService } from '../user-writing-submission/user-writing-submission.service';
import { UserSpeakingSubmissionService } from '../user-speaking-submission/user-speaking-submission.service';
import { FinishTestWritingDto } from './dto/finish-test-writing.dto';
import { FinishTestSpeakingDto } from './dto/finish-test-speaking.dto';

export interface SubmissionDetail {
  idWritingTask: string;
  task_type: string;
  submission_text: string;
  feedback: any; // Bạn có thể thay any bằng type Feedback cụ thể nếu muốn chuẩn hơn
  score: number;
}

@Injectable()
export class UserTestResultService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly streakService: StreakService,
    private readonly writingService: UserWritingSubmissionService,
    private readonly speakingService: UserSpeakingSubmissionService,
  ) { }

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
        userAnswer: true,
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

    // 5. Grade all user answers
    const gradingResults = await this.gradeAllAnswers(
      testResult.userAnswer,
      allQuestions,
    );

    // 6. Calculate scores
    const { total_correct, band_score } = this.calculateScores(
      gradingResults,
      allQuestions.length,
    );

    // 7. Calculate XP (with anti-spam check)
    const xpGained = await this.calculateXpGained(
      idUser,
      testResult.idTest,
      idTestResult,
      testResult.test.level,
      band_score,
    );

    // 8. Update user XP and streak
    await this.handleXpAndStreak(idUser, xpGained);

    // 9. Update test completion
    const updatedResult = await this.updateTestCompletion(
      idTestResult,
      total_correct,
      allQuestions.length,
      band_score,
    );

    return {
      message: 'Test finished successfully!',
      data: {
        xpGained,
        band_score,
        total_correct,
        total_questions: allQuestions.length,
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
      include: {
        userAnswer: true,
        test: {
          include: {
            parts: {
              include: {
                groupOfQuestions: {
                  include: {
                    question: {
                      include: {
                        answers: true,
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
      .flatMap((p) => p.groupOfQuestions)
      .flatMap((g) => g.question);
  }

  private async gradeAllAnswers(userAnswers: any[], allQuestions: any[]) {
    return await Promise.all(
      userAnswers.map(async (uAnswer) => {
        const questionData = allQuestions.find(
          (q) => q.idQuestion === uAnswer.idQuestion,
        );

        if (!questionData) return 0;

        const isCorrect = this.gradeUserAnswer(uAnswer, questionData);

        await this.updateAnswerCorrectness(uAnswer, isCorrect);

        return isCorrect ? 1 : 0;
      }),
    );
  }

  private gradeUserAnswer(uAnswer: any, questionData: any): boolean {
    const answerType = uAnswer.userAnswerType;

    switch (answerType) {
      case 'MCQ':
        return this.gradeMCQ(uAnswer, questionData);

      case 'MATCHING':
        return this.gradeMatching(uAnswer, questionData);

      case 'LABELING':
        return this.gradeLabeling(uAnswer, questionData);

      case 'SHORT_ANSWER':
      case 'FILL_BLANK':
      case 'YES_NO_NOTGIVEN':
        return this.gradeTextAnswer(uAnswer, questionData);

      default:
        // Default to text comparison for unknown types
        return this.gradeTextAnswer(uAnswer, questionData);
    }
  }

  private gradeMCQ(uAnswer: any, questionData: any): boolean {
    const correctKeys = questionData.answers
      .filter((a) => a.matching_value === 'CORRECT')
      .map((a) => a.matching_key?.trim().toUpperCase());

    let userSelectedKeys: string[] = [];
    if (uAnswer.matching_key) {
      userSelectedKeys = [uAnswer.matching_key.trim().toUpperCase()];
    } else if (uAnswer.answerText) {
      userSelectedKeys = uAnswer.answerText
        .split(',')
        .map((s) => s.trim().toUpperCase());
    }

    if (correctKeys.length > 0 && userSelectedKeys.length > 0) {
      return userSelectedKeys.every((key) => correctKeys.includes(key));
    }

    return false;
  }

  private gradeMatching(uAnswer: any, questionData: any): boolean {
    // User's selected matching key (e.g., "ix", "iii", "vii")
    const userKey = uAnswer.matching_key?.trim().toLowerCase();

    // If user didn't select anything, it's wrong
    if (!userKey) return false;

    // Find the correct answer by checking which answer has matching_value = 'CORRECT'
    const correctAnswer = questionData.answers.find(
      (a) => a.matching_value === 'CORRECT',
    );

    if (!correctAnswer || !correctAnswer.matching_key) return false;

    // Compare user's key with the correct answer's key
    return userKey === correctAnswer.matching_key.trim().toLowerCase();
  }

  private gradeLabeling(uAnswer: any, questionData: any): boolean {
    const userKey = uAnswer.matching_key?.trim().toUpperCase();

    // Check if user's matching_key exists in DB with matching_value = 'CORRECT'
    return questionData.answers.some(
      (a) =>
        a.matching_key?.trim().toUpperCase() === userKey &&
        a.matching_value === 'CORRECT',
    );
  }

  private gradeTextAnswer(uAnswer: any, questionData: any): boolean {
    // If user left answer blank
    if (!uAnswer.answerText || uAnswer.answerText.trim() === '') {
      return false;
    }

    const userTextNormalized = uAnswer.answerText.trim().toLowerCase();

    // Check if user's text matches any correct answer
    return questionData.answers.some((a) => {
      const dbAnswerText = a.answer_text?.trim().toLowerCase();
      const dbMatchingValue = a.matching_value?.trim().toLowerCase();

      // Match with either answer_text or matching_value in DB
      return (
        dbAnswerText === userTextNormalized ||
        dbMatchingValue === userTextNormalized
      );
    });
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
    const total_correct = gradingResults.reduce((sum, val) => sum + val, 0);
    const band_score = this.calculateIELTSBandScore(
      total_correct,
      totalQuestions,
    );

    return { total_correct, band_score };
  }

  /**
   * Calculate XP with anti-spam check
   */
  private async calculateXpGained(
    idUser: string,
    idTest: string,
    currentTestResultId: string,
    level: 'Low' | 'Mid' | 'High' | 'Great',
    band_score: number,
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
    return alreadyCompletedToday ? 0 : this.calculateXp(level, band_score);
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
    total_correct: number,
    total_questions: number,
    band_score: number,
  ) {
    return await this.databaseService.userTestResult.update({
      where: { idTestResult: idTestResult },
      data: {
        status: 'FINISHED',
        finishedAt: new Date(),
        total_correct: total_correct,
        total_questions: total_questions,
        band_score: band_score,
        score: total_correct,
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
    return 0.0;
  }

  async getAllAnswerInTestResult(idTestResult: string) {

    const testInfo = await this.databaseService.userTestResult.findUnique({
      where: { idTestResult },
      select: {
        test: {
          select: {
            testType: true
          }
        }
      }
    })

    let data: any;

    if (testInfo?.test.testType === TestType.WRITING) {
      data = await this.databaseService.userTestResult.findUnique({
        where: { idTestResult, status: TestStatus.FINISHED, },
        include: {
          test: {
            include: {
              writingTasks: {
                orderBy: {
                  task_type: 'asc'
                }
              },

            },
          },
          writingSubmission: {
            include: {
              feedback: true
            }
          }
        }
      })
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
                  questions: true
                },
                orderBy: {
                  part: 'asc'
                }
              }
            }
          },
          speakingSubmission: {
            include: {
              feedback: true
            }
          }
        }
      })
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
          userAnswer: true,
          test: {
            include: {
              parts: {
                include: {
                  passage: true,
                  groupOfQuestions: {
                    include: {
                      question: {
                        include: {
                          answers: true,
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
        .filter(s => s.submission_text?.trim())
        .map(s => s.idWritingTask);

      const tasks = await this.databaseService.writingTask.findMany({
        where: { idWritingTask: { in: taskIds } },
        select: { idWritingTask: true, task_type: true },
      });
      const taskMap = new Map(tasks.map(t => [t.idWritingTask, t]));

      // ✅ OPTIMIZATION 2: Parallel AI grading (instead of sequential)
      const gradingPromises = body.writingSubmissions
        .filter(s => s.submission_text?.trim())
        .map(async (submission) => {
          const taskInfo = taskMap.get(submission.idWritingTask);
          if (!taskInfo) return null;

          try {
            // Gọi AI chấm điểm
            const result = await this.writingService.createUserWritingSubmission(
              idTestResult,
              {
                idUser: idUser,
                idWritingTask: submission.idWritingTask,
                submission_text: submission.submission_text,
              },
            );

            return {
              taskInfo,
              result,
            };
          } catch (error) {
            console.error(`Failed to grade task ${submission.idWritingTask}:`, error);
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
          task_type: taskInfo.task_type,
          submission_text: result.submission_text,
          feedback: result.feedback,
          score: result.score,
        });

        if (taskInfo.task_type === WritingTaskType.TASK1) {
          scoreTask1 = result.score;
        } else if (taskInfo.task_type === WritingTaskType.TASK2) {
          scoreTask2 = result.score;
        } else {
          scoreTask1 += result.score;
        }
      }
    }

    let rawScore = (scoreTask1 + scoreTask2 * 2) / 3;

    let band_score = Math.round(rawScore * 2) / 2;

    const xpGained = await this.calculateXpGained(
      idUser,
      testResult.idTest,
      idTestResult,
      testResult.test.level,
      band_score,
    );

    await this.handleXpAndStreak(idUser, xpGained);

    const updatedResult = await this.databaseService.userTestResult.update({
      where: { idTestResult },
      data: {
        status: 'FINISHED',
        finishedAt: new Date(),
        band_score: band_score,
        total_questions: submittedCount,
      },
    });

    return {
      message: 'Writing test finished and graded successfully!',
      data: {
        idTestResult,
        xpGained,
        band_score,
        breakdown: {
          task1_score: scoreTask1,
          task2_score: scoreTask2,
        },
        submissions: submissionsDetails,
        finishedAt: updatedResult.finishedAt,
        submissions_count: submittedCount,
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
            speakingTasks: true, // Lấy danh sách task để map ID
          },
        },
      },
    });

    if (!testResult) throw new NotFoundException('Test result not found');
    if (testResult.idUser !== idUser) {
      throw new BadRequestException('You do not have permission to finish this test');
    }
    if (testResult.status !== 'IN_PROGRESS') {
      throw new BadRequestException('This test is not in progress.');
    }
    if (testResult.test.testType !== TestType.SPEAKING) {
      throw new BadRequestException('This endpoint is for Speaking tests only.');
    }

    const tasks = testResult.test.speakingTasks;
    if (!tasks || tasks.length === 0) {
      throw new BadRequestException('This test configuration is missing speaking tasks.');
    }

    const partScores = [
      { part: SpeakingPartType.PART1, score: 0 },
      { part: SpeakingPartType.PART2, score: 0 },
      { part: SpeakingPartType.PART3, score: 0 },
    ];
    const submissionsDetails: any[] = [];

    const processPart = async (
      partType: SpeakingPartType,
      audioFiles?: Express.Multer.File[]
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

        const score = result.data?.feedback?.overallScore || 0;

        const partIndex = partScores.findIndex((p) => p.part === partType);
        if (partIndex !== -1) {
          partScores[partIndex].score = score;
        }

        submissionsDetails.push({
          part: partType,
          idSpeakingSubmission: result.data?.idSpeakingSubmission,
          audioUrl: result.data?.audioUrl,
          transcript: result.data?.transcript,
          feedback: result.data?.feedback,
          score,
        });
      }
    };


    await Promise.all([
      processPart('PART1', files.part1Audio),
      processPart('PART2', files.part2Audio),
      processPart('PART3', files.part3Audio),
    ]);

    // ✅ FIX BUG 1: Tính điểm Band Score theo chuẩn IELTS
    // Luôn tính trung bình 3 phần, phần nào không nộp = 0 điểm
    const totalScore = partScores.reduce((sum, p) => sum + p.score, 0);
    const submittedPartsCount = submissionsDetails.length; // Số phần thực sự nộp (để hiển thị)

    // Luôn chia 3 (trung bình 3 phần), làm tròn 0.5
    const band_score = Math.round((totalScore / 3) * 2) / 2;

    // Nếu bạn muốn chia cho số phần user thực sự làm: (totalScore / submittedPartsCount)

    // 4. Calculate XP
    const xpGained = await this.calculateXpGained(
      idUser,
      testResult.idTest,
      idTestResult,
      testResult.test.level,
      band_score,
    );

    // 5. Update Streak & XP
    await this.handleXpAndStreak(idUser, xpGained);

    // 6. Update Test Result Status
    const updatedResult = await this.databaseService.userTestResult.update({
      where: { idTestResult },
      data: {
        status: 'FINISHED',
        finishedAt: new Date(),
        band_score: band_score,
        total_questions: submittedPartsCount, // Số phần đã nộp
      },
    });

    return {
      message: 'Speaking test finished and graded successfully!',
      data: {
        idTestResult,
        xpGained,
        band_score,
        breakdown: partScores.reduce((acc, p) => {
          acc[p.part] = p.score;
          return acc;
        }, {} as Record<string, number>),
        submissions: submissionsDetails,
        finishedAt: updatedResult.finishedAt,
        submissions_count: submittedPartsCount,
      },
      status: 200,
    };
  }
}

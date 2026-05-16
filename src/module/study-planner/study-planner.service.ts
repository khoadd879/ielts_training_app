import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CalculatePlanDto } from './dto/calculate-plan.dto';
import { CompleteTaskDto } from './dto/complete-task.dto';

/**
 * Study Planner Service v2 - Research-based learning plan generator
 * Based on SpecificPlan.md research:
 * - Band improvement rates (British Council): <5.5: 0.5/month, 5.5-7.0: 0.3/month, >7.0: 0.2/month
 * - Nation's Four Strands: adaptive ratios based on time available
 * - Krashen's i+1 Hypothesis
 * - Zimmerman's Self-Regulated Learning
 */

interface TimeValidation {
  severity: 'critical' | 'high' | 'medium' | 'ok';
  message: string;
  adjustedTarget?: number;
  totalHoursNeeded: number;
  minimumDailyMinutes: number;
}

interface DailyTask {
  id: string;
  type: 'READING' | 'LISTENING' | 'WRITING' | 'SPEAKING' | 'VOCABULARY' | 'GRAMMAR';
  name: string;
  description: string;
  completed: boolean;
  route: string;
  routeParams: Record<string, any>;
  estimatedMinutes: number;
}

interface DayPlan {
  date: string;
  dayName: string;
  tasks: DailyTask[];
  isRestDay: boolean;
  completedCount: number;
  totalCount: number;
}

interface StudyPlan {
  isRealistic: boolean;
  warning?: string;
  adjustedTarget?: number;
  currentBand: number;
  targetBand: number;
  daysUntilExam: number;
  maxPossibleGain: number;
  dailyMinutes: number;
  timeValidation?: TimeValidation;
  dailyTasks: DailyTask[];
  weeklyPlan: DayPlan[];
  fourStrandBalance: FourStrandBalance;
  difficultyLevel: 'easier' | 'standard' | 'challenging';
  motivationTips: string[];
  metacognitivePrompts: string[];
  recommendation: {
    status: 'warn' | 'ok';
    message: string;
  };
}

interface FourStrandBalance {
  input: number;
  output: number;
  language: number;
  fluency: number;
}

@Injectable()
export class StudyPlannerService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Calculate realistic target and generate study plan
   * Based on research-based band improvement rates
   */
  async calculatePlan(dto: CalculatePlanDto): Promise<StudyPlan> {
    const { currentBand, targetBand, daysUntilExam, studyMinutesPerDay = 120 } = dto;
    const bandGap = targetBand - currentBand;

    // Calculate max possible gain based on research rates
    const maxMonthlyRate = this.getMaxMonthlyRate(currentBand);
    const monthsUntilExam = daysUntilExam / 30;
    const maxPossibleGain = maxMonthlyRate * monthsUntilExam;

    // Calculate 4-strand balance with adaptive ratios
    const fourStrandBalance = this.calculateFourStrandBalance(studyMinutesPerDay);

    // Calculate time validation
    const timeValidation = this.validateTime(currentBand, targetBand, daysUntilExam, studyMinutesPerDay);

    // Check if target is realistic (allow 1.5x for challenging but possible)
    const isRealistic = bandGap <= maxPossibleGain * 1.5;

    // Generate daily tasks
    const dailyTasks = this.generateDailyTasks(studyMinutesPerDay);

    // Generate weekly plan
    const weeklyPlan = this.generateWeeklyPlan(studyMinutesPerDay);

    // Generate response
    const plan: StudyPlan = {
      isRealistic,
      currentBand,
      targetBand,
      daysUntilExam,
      maxPossibleGain,
      dailyMinutes: studyMinutesPerDay,
      timeValidation,
      dailyTasks,
      weeklyPlan,
      fourStrandBalance,
      difficultyLevel: this.determineDifficultyLevel(currentBand, targetBand),
      motivationTips: this.generateMotivationTips(currentBand, targetBand, daysUntilExam),
      metacognitivePrompts: this.generateMetacognitivePrompts(),
      recommendation: this.getRecommendation(studyMinutesPerDay, currentBand, targetBand),
    };

    if (!isRealistic) {
      plan.warning = this.generateWarning(currentBand, targetBand, daysUntilExam, maxPossibleGain);
      plan.adjustedTarget = Math.min(targetBand, currentBand + maxPossibleGain);
    }

    return plan;
  }

  private getRecommendation(minutes: number, currentBand: number, targetBand: number): { status: 'warn' | 'ok'; message: string } {
    if (minutes < 45) {
      return { status: 'warn', message: `Với ${minutes} phút/ngày, khó đạt tiến bộ đáng kể. Nên học ít nhất 60 phút.` };
    } else if (minutes < 60) {
      return { status: 'warn', message: `Khuyến nghị: 60-90 phút/ngày. ${minutes} phút có thể đạt ~0.3 band/tháng.` };
    } else if (minutes < 90) {
      return { status: 'ok', message: `Khuyến nghị: 60-90 phút/ngày để đạt mục tiêu band ${targetBand}.` };
    } else {
      return { status: 'ok', message: `Tuyệt vời! ${minutes} phút/ngày giúp tiến bộ nhanh hơn.` };
    }
  }

  private getMaxMonthlyRate(currentBand: number): number {
    if (currentBand < 5.5) return 0.5;
    if (currentBand < 7.0) return 0.3;
    return 0.2;
  }

  private calculateFourStrandBalance(dailyMinutes: number): FourStrandBalance {
    let ratios: FourStrandBalance;
    if (dailyMinutes <= 60) ratios = { input: 40, output: 40, language: 15, fluency: 5 };
    else if (dailyMinutes <= 90) ratios = { input: 35, output: 35, language: 20, fluency: 10 };
    else if (dailyMinutes <= 150) ratios = { input: 35, output: 35, language: 20, fluency: 10 };
    else if (dailyMinutes <= 210) ratios = { input: 33, output: 33, language: 22, fluency: 12 };
    else ratios = { input: 30, output: 30, language: 25, fluency: 15 };

    return {
      input: Math.round(dailyMinutes * ratios.input / 100),
      output: Math.round(dailyMinutes * ratios.output / 100),
      language: Math.round(dailyMinutes * ratios.language / 100),
      fluency: Math.round(dailyMinutes * ratios.fluency / 100),
    };
  }

  private validateTime(currentBand: number, targetBand: number, daysUntilExam: number, studyMinutesPerDay: number): TimeValidation {
    const bandGap = targetBand - currentBand;
    const totalHoursNeeded = bandGap * 150;
    const minimumDailyMinutes = (totalHoursNeeded * 60) / daysUntilExam;
    const ratio = (studyMinutesPerDay / minimumDailyMinutes) * 100;

    let severity: 'critical' | 'high' | 'medium' | 'ok';
    let message: string;

    if (ratio < 50) {
      severity = 'critical';
      const achievableBand = currentBand + (studyMinutesPerDay * daysUntilExam) / (150 * 60);
      message = `Với ${studyMinutesPerDay} phút/ngày, chỉ đạt ~${achievableBand.toFixed(1)} band.`;
    } else if (ratio < 80) {
      severity = 'high';
      message = `Với ${studyMinutesPerDay} phút/ngày, lộ trình khá khắc nghiệt.`;
    } else if (ratio < 100) {
      severity = 'medium';
      message = `Mục tiêu band ${targetBand} có thể đạt được nhưng cần học đều đặn.`;
    } else {
      severity = 'ok';
      message = `Với ${studyMinutesPerDay} phút/ngày, mục tiêu band ${targetBand} hoàn toàn khả thi.`;
    }

    return {
      severity,
      message,
      totalHoursNeeded: Math.round(totalHoursNeeded),
      minimumDailyMinutes: Math.ceil(minimumDailyMinutes),
      adjustedTarget: ratio < 100 ? currentBand + (studyMinutesPerDay * daysUntilExam) / (150 * 60) : undefined,
    };
  }

  private determineDifficultyLevel(currentBand: number, targetBand: number): 'easier' | 'standard' | 'challenging' {
    const gap = targetBand - currentBand;
    if (gap > 1.5) return 'easier';
    if (gap > 0.5) return 'standard';
    return 'challenging';
  }

  private generateWarning(currentBand: number, targetBand: number, daysUntilExam: number, maxPossibleGain: number): string {
    const bandGap = targetBand - currentBand;
    const monthsNeeded = Math.ceil(bandGap / this.getMaxMonthlyRate(currentBand) * 30);
    return `Với band ${currentBand.toFixed(1)} và ${daysUntilExam} ngày, mục tiêu band ${targetBand} không thực tế. Max possible gain: ${maxPossibleGain.toFixed(1)}. Cần ít nhất ${monthsNeeded} ngày.`;
  }

  private generateMotivationTips(currentBand: number, targetBand: number, daysUntilExam: number): string[] {
    const tips: string[] = [];
    if (daysUntilExam > 90) tips.push("Bạn có thời gian chuẩn bị tốt - hãy tập trung vào tiến bộ ổn định");
    tips.push("Bạn có thể chọn thứ tự học từ gợi ý bên dưới");
    tips.push("Tham gia forum để kết nối với người cùng mục tiêu");
    return tips;
  }

  private generateMetacognitivePrompts(): string[] {
    return [
      "Sau mỗi bài luyện: 'Mình đã hiểu được bao nhiêu % nội dung?'",
      "Cuối tuần: 'Tuần này mình tiến bộ gì? Cần cải thiện gì?'",
      "Khi gặp khó khăn: 'Mình có đang học đúng cách không?'",
      "Trước khi học: 'Hôm nay mình sẽ tập trung vào kỹ năng gì?'",
    ];
  }

  private generateDailyTasks(studyMinutesPerDay: number): DailyTask[] {
    const tasks: DailyTask[] = [];
    const time = studyMinutesPerDay;

    if (time <= 30) {
      tasks.push(this.createTask('READING', 'Luyện đọc Passage', 'Cải thiện yếu điểm Reading', 20));
      tasks.push(this.createTask('VOCABULARY', 'Học từ vựng (SM-2)', 'Ôn từ đã học', 10));
    } else if (time <= 60) {
      tasks.push(this.createTask('READING', 'Luyện đọc Passage', 'Cải thiện yếu điểm Reading', 20));
      tasks.push(this.createTask('SPEAKING', 'Luyện Speaking Part 3', 'Cải thiện Speaking', 15));
      tasks.push(this.createTask('VOCABULARY', 'Học từ vựng (SM-2)', '15 từ cần ôn', 15));
      tasks.push(this.createTask('GRAMMAR', 'Luyện Verb Tenses', 'Grammar yếu cần cải thiện', 10));
    } else if (time <= 90) {
      tasks.push(this.createTask('READING', 'Luyện đọc Passage', 'Cải thiện yếu điểm Reading', 20));
      tasks.push(this.createTask('LISTENING', 'Luyện nghe', 'Cải thiện Listening', 20));
      tasks.push(this.createTask('SPEAKING', 'Luyện Speaking Part 3', 'Cải thiện Speaking', 15));
      tasks.push(this.createTask('VOCABULARY', 'Học từ vựng (SM-2)', '15 từ cần ôn', 15));
      tasks.push(this.createTask('GRAMMAR', 'Luyện Verb Tenses', 'Grammar yếu cần cải thiện', 10));
    } else {
      tasks.push(this.createTask('READING', 'Luyện đọc Passage', 'Cải thiện Reading', 20));
      tasks.push(this.createTask('LISTENING', 'Luyện nghe', 'Cải thiện Listening', 20));
      tasks.push(this.createTask('WRITING', 'Luyện viết Essay', 'Cải thiện Writing', 20));
      tasks.push(this.createTask('SPEAKING', 'Luyện Speaking Part 3', 'Cải thiện Speaking', 20));
      tasks.push(this.createTask('VOCABULARY', 'Học từ vựng (SM-2)', '15 từ cần ôn', 15));
      tasks.push(this.createTask('GRAMMAR', 'Luyện Verb Tenses', 'Grammar yếu cần cải thiện', 15));
    }
    return tasks;
  }

  private createTask(type: 'READING' | 'LISTENING' | 'WRITING' | 'SPEAKING' | 'VOCABULARY' | 'GRAMMAR', name: string, description: string, minutes: number): DailyTask {
    const routeMap: Record<string, { route: string; paramKey: string; paramValue: string }> = {
      READING: { route: '/doTest', paramKey: 'skill', paramValue: 'READING' },
      LISTENING: { route: '/doTest', paramKey: 'skill', paramValue: 'LISTENING' },
      WRITING: { route: '/doTest', paramKey: 'skill', paramValue: 'WRITING' },
      SPEAKING: { route: '/doTest', paramKey: 'skill', paramValue: 'SPEAKING' },
      VOCABULARY: { route: '/vocabulary', paramKey: 'mode', paramValue: 'review' },
      GRAMMAR: { route: '/grammar', paramKey: 'idGrammar', paramValue: 'verb-tenses' },
    };
    const mapping = routeMap[type];
    return {
      id: `${type.toLowerCase()}-${Date.now()}`,
      type,
      name,
      description,
      completed: false,
      route: mapping.route,
      routeParams: { [mapping.paramKey]: mapping.paramValue },
      estimatedMinutes: minutes,
    };
  }

  private generateWeeklyPlan(dailyMinutes: number): DayPlan[] {
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1);

    const weekPlans: DayPlan[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const isSunday = i === 0;
      const tasks = isSunday ? [] : this.generateDailyTasks(dailyMinutes).map(t => ({ ...t, id: `${t.type.toLowerCase()}-${date.toISOString().split('T')[0]}` }));
      weekPlans.push({ date: date.toISOString().split('T')[0], dayName: dayNames[i], tasks, isRestDay: isSunday, completedCount: 0, totalCount: tasks.length });
    }
    return weekPlans;
  }

  async completeTask(idUser: string, idStudyPlan: string, taskId: string, dto: CompleteTaskDto): Promise<{ success: boolean; completed: boolean; completedAt: Date | null }> {
    const taskType = taskId.split('-')[0].toUpperCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const completedAt = dto.completed ? (dto.completedAt ? new Date(dto.completedAt) : new Date()) : null;

    await this.db.userDailyTaskCompletion.upsert({
      where: { idUser_idStudyPlan_taskType_date: { idUser, idStudyPlan, taskType: taskType.toUpperCase(), date: today } },
      create: { idUser, idStudyPlan, taskType: taskType.toUpperCase(), date: today, completed: dto.completed, completedAt },
      update: { completed: dto.completed, completedAt },
    });
    return { success: true, completed: dto.completed, completedAt };
  }

  async getUserStudyPlan(idUser: string) {
    const user = await this.db.user.findUnique({ where: { idUser }, select: { targetBandScore: true, targetExamDate: true } });
    if (!user) return { error: 'User not found' };

    const recentResults = await this.db.userTestResult.findMany({
      where: { idUser, status: 'FINISHED' },
      orderBy: { finishedAt: 'desc' },
      take: 10,
      include: { test: { select: { testType: true } } },
    });

    const skillBands: Record<string, number[]> = { LISTENING: [], READING: [], WRITING: [], SPEAKING: [] };
    for (const result of recentResults) {
      const skill = result.test.testType;
      if (result.bandScore > 0) skillBands[skill].push(result.bandScore);
    }

    let currentBand = 5.0;
    if (recentResults.length > 0) {
      const allBands = Object.values(skillBands).flat();
      if (allBands.length > 0) currentBand = allBands.reduce((a, b) => a + b, 0) / allBands.length;
    }

    const daysUntilExam = user.targetExamDate ? Math.max(1, Math.ceil((user.targetExamDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 60;
    const preference = await this.db.userStudyPreference.findUnique({ where: { idUser } });
    const studyMinutesPerDay = preference?.dailyMinutesAvailable || 120;

    return this.calculatePlan({
      idUser,
      currentBand: Math.round(currentBand * 10) / 10,
      targetBand: user.targetBandScore || 6.5,
      daysUntilExam,
      studyMinutesPerDay,
    });
  }

  async updateStudyPreference(idUser: string, dailyMinutesAvailable: number) {
    await this.db.userStudyPreference.upsert({
      where: { idUser },
      create: { idUser, dailyMinutesAvailable },
      update: { dailyMinutesAvailable },
    });
    return { success: true, dailyMinutesAvailable };
  }
}
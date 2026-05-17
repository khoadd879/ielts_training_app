import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CalculatePlanDto } from './dto/calculate-plan.dto';
import { CompleteTaskDto } from './dto/complete-task.dto';

// Stage enum
export enum Stage {
  FOUNDATION = "FOUNDATION",
  SKILL_BUILDING = "SKILL_BUILDING",
  INTEGRATION = "INTEGRATION",
  EXAM_PREP = "EXAM_PREP"
}

// Stage configurations
const STAGE_CONFIGS: Record<Stage, {
  bandRange: [number, number];
  minVocabMastered: number;
  minGrammarProficiency: string;
  recommendedMinutes: [number, number];
  fourStrandBalance: FourStrandBalance;
  themes: { theme: string; description: string }[];
}> = {
  [Stage.FOUNDATION]: {
    bandRange: [0, 5.0],
    minVocabMastered: 0,
    minGrammarProficiency: "weak",
    recommendedMinutes: [60, 90],
    fourStrandBalance: { input: 40, output: 30, language: 20, fluency: 10 },
    themes: [
      { theme: "Nền tảng từ vựng", description: "Tập trung xây dựng vốn từ vựng cơ bản" },
      { theme: "Nền tảng ngữ pháp", description: "Học các cấu trúc ngữ pháp nền tảng" },
      { theme: "Nền tảng đọc", description: "Luyện kỹ năng đọc hiểu cơ bản" },
      { theme: "Nền tảng nghe", description: "Luyện kỹ năng nghe hiểu cơ bản" }
    ]
  },
  [Stage.SKILL_BUILDING]: {
    bandRange: [5.0, 6.0],
    minVocabMastered: 50,
    minGrammarProficiency: "medium",
    recommendedMinutes: [90, 120],
    fourStrandBalance: { input: 35, output: 35, language: 20, fluency: 10 },
    themes: [
      { theme: "Rèn đọc", description: "Nâng cao kỹ năng đọc với passages phức tạp hơn" },
      { theme: "Rèn nghe", description: "Luyện nghe với nhiều accent và tốc độ" },
      { theme: "Rèn viết", description: "Phát triển kỹ năng viết câu và đoạn" },
      { theme: "Rèn nói", description: "Tự tin giao tiếp với các chủ đề quen thuộc" }
    ]
  },
  [Stage.INTEGRATION]: {
    bandRange: [6.0, 7.0],
    minVocabMastered: 150,
    minGrammarProficiency: "strong",
    recommendedMinutes: [120, 150],
    fourStrandBalance: { input: 30, output: 40, language: 20, fluency: 10 },
    themes: [
      { theme: "Tích hợp R+W", description: "Kết hợp đọc và viết trong các bài tập thực tế" },
      { theme: "Tích hợp L+S", description: "Kết hợp nghe và nói trong các tình huống" },
      { theme: "Tích hợp ngữ pháp", description: "Sử dụng ngữ pháp nâng cao trong ngữ cảnh" },
      { theme: "Tích hợp từ vựng", description: "Sử dụng từ vựng học thuật trong giao tiếp" }
    ]
  },
  [Stage.EXAM_PREP]: {
    bandRange: [7.0, 9.0],
    minVocabMastered: 300,
    minGrammarProficiency: "strong",
    recommendedMinutes: [150, 180],
    fourStrandBalance: { input: 25, output: 45, language: 15, fluency: 15 },
    themes: [
      { theme: "Luyện đề Listening", description: "Giải đề IELTS Listening với thời gian thực" },
      { theme: "Luyện đề Reading", description: "Giải đề IELTS Reading với time management" },
      { theme: "Luyện đề Writing", description: "Luyện viết Task 1 và Task 2 với feedback" },
      { theme: "Luyện đề Speaking", description: "Mô phỏng bài thi Speaking với giáo viên" }
    ]
  }
};

// Stage transitions
const STAGE_TRANSITIONS: { from: Stage; to: Stage; conditions: { minAvgBand: number; minVocabMastered: number; minGrammarProficiency: string; minCompletionRate: number; minWeeksInStage: number } }[] = [
  { from: Stage.FOUNDATION, to: Stage.SKILL_BUILDING, conditions: { minAvgBand: 5.0, minVocabMastered: 50, minGrammarProficiency: "medium", minCompletionRate: 0.75, minWeeksInStage: 2 } },
  { from: Stage.SKILL_BUILDING, to: Stage.INTEGRATION, conditions: { minAvgBand: 6.0, minVocabMastered: 150, minGrammarProficiency: "strong", minCompletionRate: 0.80, minWeeksInStage: 2 } },
  { from: Stage.INTEGRATION, to: Stage.EXAM_PREP, conditions: { minAvgBand: 7.0, minVocabMastered: 300, minGrammarProficiency: "strong", minCompletionRate: 0.85, minWeeksInStage: 2 } }
];

// Proficiency interfaces
interface VocabStats {
  totalWords: number;
  mastered: number;
  learning: number;
  new: number;
}

interface GrammarStats {
  total: number;
  strong: number;
  medium: number;
  weak: number;
  unknown: number;
}

interface UserProficiency {
  avgBand: number;
  stage: Stage;
  vocabStats: VocabStats;
  grammarStats: GrammarStats;
  completionRate: number;
  readinessScore: number;
}

interface StageProgress {
  currentStage: Stage;
  weeksInStage: number;
  stageProgressPercent: number;
  readinessScore: number;
  nextMilestone: {
    stage: Stage;
    requirements: string[];
    currentValues: Record<string, number>;
  } | null;
}

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
  reason: string;
  completed: boolean;
  route: string;
  routeParams: Record<string, any>;
  estimatedMinutes: number;
  difficulty: 'easy' | 'medium' | 'hard';
  strand: 'input' | 'output' | 'language' | 'fluency';
}

interface DayPlan {
  date: string;
  dayName: string;
  tasks: DailyTask[];
  isRestDay: boolean;
  completedCount: number;
  totalCount: number;
  strandBreakdown: {
    input: number;
    output: number;
    language: number;
    fluency: number;
  };
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
    const prof = await this.calculateUserProficiency(dto.idUser);
    const weeklyTheme = this.getWeeklyTheme(prof.stage, Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000)));
    const dailyTasks = await this.generateDailyTasks(dto.idUser, prof.stage, weeklyTheme.theme, studyMinutesPerDay);

    // Generate weekly plan
    const weeklyPlan = await this.generateWeeklyPlan(studyMinutesPerDay, prof.stage, 0);

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

  private async generateDailyTasks(
  userId: string,
  stage: Stage,
  theme: string,
  totalMinutes: number
): Promise<DailyTask[]> {
  const tasks: DailyTask[] = [];
  const prof = await this.calculateUserProficiency(userId);

  // Get weak skills
  const weakSkills = await this.getWeakSkills(userId, 2);

  // Get strand config for stage
  const strandConfig = STAGE_CONFIGS[stage].fourStrandBalance;

  // Calculate minutes per strand
  const inputMinutes = Math.round(totalMinutes * strandConfig.input / 100);
  const outputMinutes = Math.round(totalMinutes * strandConfig.output / 100);
  const languageMinutes = Math.round(totalMinutes * strandConfig.language / 100);
  const fluencyMinutes = Math.round(totalMinutes * strandConfig.fluency / 100);

  // Input tasks (Reading + Listening)
  if (inputMinutes > 0 && weakSkills.input.length > 0) {
    const skill = weakSkills.input[0];
    tasks.push(await this.createInputTask(skill, theme, Math.min(inputMinutes, 25), prof.avgBand));
  }

  // Output tasks (Writing + Speaking)
  if (outputMinutes > 0 && weakSkills.output.length > 0) {
    const skill = weakSkills.output[0];
    tasks.push(await this.createOutputTask(skill, theme, Math.min(outputMinutes, 25), prof.avgBand));
  }

  // Language tasks (Vocab)
  if (languageMinutes > 0 && prof.vocabStats.totalWords > 0) {
    tasks.push(this.createVocabTask(Math.min(languageMinutes - 10, 15)));
  }

  // Language tasks (Grammar)
  if (languageMinutes > 10) {
    const grammarWeak = await this.getGrammarWeakAreas(userId, 1);
    if (grammarWeak.length > 0) {
      tasks.push(await this.createGrammarTask(grammarWeak[0], Math.min(10, 15)));
    }
  }

  // Fluency task
  if (fluencyMinutes >= 10) {
    tasks.push(this.createFluencyTask(stage, Math.min(fluencyMinutes, 15)));
  }

  return tasks;
}

  private async createInputTask(skill: string, theme: string, minutes: number, avgBand: number): Promise<DailyTask> {
  const skillLabel = skill === 'READING' ? 'đọc' : 'nghe';
  const difficulty = avgBand < 5.5 ? 'easy' : avgBand < 6.5 ? 'medium' : 'hard';

  return {
    id: `input-${skill.toLowerCase()}-${Date.now()}`,
    type: skill as 'READING' | 'LISTENING',
    name: `Luyện ${skillLabel} - ${theme}`,
    description: `Cải thiện yếu điểm: ${skill} band thấp`,
    reason: `Weak skill detected: ${skill} là kỹ năng yếu nhất của bạn`,
    completed: false,
    route: '/doTest',
    routeParams: { skill, practice: true },
    estimatedMinutes: minutes,
    difficulty,
    strand: 'input'
  };
}

private async createOutputTask(skill: string, theme: string, minutes: number, avgBand: number): Promise<DailyTask> {
  const skillLabel = skill === 'WRITING' ? 'viết' : 'nói';
  const difficulty = avgBand < 5.5 ? 'easy' : avgBand < 6.5 ? 'medium' : 'hard';

  return {
    id: `output-${skill.toLowerCase()}-${Date.now()}`,
    type: skill as 'WRITING' | 'SPEAKING',
    name: `Rèn ${skillLabel} - ${theme}`,
    description: `Cải thiện yếu điểm: ${skill} band thấp`,
    reason: `Weak skill detected: ${skill} cần được cải thiện`,
    completed: false,
    route: '/doTest',
    routeParams: { skill, practice: true },
    estimatedMinutes: minutes,
    difficulty,
    strand: 'output'
  };
}

private createVocabTask(minutes: number): DailyTask {
  return {
    id: `vocab-${Date.now()}`,
    type: 'VOCABULARY',
    name: 'Học từ vựng (SM-2)',
    description: 'Ôn từ vựng theo lịch trình spaced repetition',
    reason: 'Vocab là nền tảng của mọi kỹ năng IELTS',
    completed: false,
    route: '/vocabulary',
    routeParams: { mode: 'review' },
    estimatedMinutes: minutes,
    difficulty: 'medium',
    strand: 'language'
  };
}

private async createGrammarTask(grammar: any, minutes: number): Promise<DailyTask> {
  return {
    id: `grammar-${Date.now()}`,
    type: 'GRAMMAR',
    name: `Luyện ${grammar.title || 'ngữ pháp'}`,
    description: grammar.explanation ? grammar.explanation.substring(0, 50) + '...' : 'Cải thiện ngữ pháp yếu',
    reason: 'Grammar là điểm yếu được xác định từ bài kiểm tra',
    completed: false,
    route: '/grammar',
    routeParams: { idGrammar: grammar.idGrammar },
    estimatedMinutes: minutes,
    difficulty: 'medium',
    strand: 'language'
  };
}

private createFluencyTask(stage: Stage, minutes: number): DailyTask {
  const taskNames: Record<Stage, string> = {
    [Stage.FOUNDATION]: 'Luyện phát âm cơ bản',
    [Stage.SKILL_BUILDING]: 'Luyện nói theo chủ đề',
    [Stage.INTEGRATION]: 'Tự tin giao tiếp',
    [Stage.EXAM_PREP]: 'Mô phỏng phỏng vấn'
  };

  return {
    id: `fluency-${Date.now()}`,
    type: 'SPEAKING',
    name: taskNames[stage],
    description: 'Rèn luyện sự mạnh dạn trong giao tiếp',
    reason: 'Fluency cần được rèn luyện đều đặn',
    completed: false,
    route: '/doTest',
    routeParams: { skill: 'SPEAKING', practice: true },
    estimatedMinutes: minutes,
    difficulty: 'medium',
    strand: 'fluency'
  };
}

private async getGrammarWeakAreas(userId: string, limit: number): Promise<any[]> {
  const proficiencies = await this.db.userGrammarProficiency.findMany({
    where: { idUser: userId, proficiency: { in: ['weak', 'unknown'] } },
    take: limit,
    include: { grammar: true },
    orderBy: { updatedAt: 'asc' }
  });

  return proficiencies.map(p => p.grammar);
}

  private async generateWeeklyPlan(dailyMinutes: number, stage: Stage, weekOffset: number = 0): Promise<DayPlan[]> {
  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1);

  const weekPlans: DayPlan[] = [];
  const theme = this.getWeeklyTheme(stage, weekOffset);

  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    const isSunday = i === 0;

    const tasks = isSunday
      ? []
      : (await this.generateDailyTasks('', stage, theme.theme, dailyMinutes)).map((t, idx) => ({
          ...t,
          id: `${t.type.toLowerCase()}-${date.toISOString().split('T')[0]}-${idx}`
        }));

    const strandConfig = STAGE_CONFIGS[stage].fourStrandBalance;
    weekPlans.push({
      date: date.toISOString().split('T')[0],
      dayName: dayNames[i],
      tasks,
      isRestDay: isSunday,
      completedCount: 0,
      totalCount: tasks.length,
      strandBreakdown: {
        input: Math.round(dailyMinutes * strandConfig.input / 100),
        output: Math.round(dailyMinutes * strandConfig.output / 100),
        language: Math.round(dailyMinutes * strandConfig.language / 100),
        fluency: Math.round(dailyMinutes * strandConfig.fluency / 100)
      }
    });
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
    try {
      const user = await this.db.user.findUnique({ where: { idUser }, select: { targetBandScore: true, targetExamDate: true } });
      if (!user) {
        throw new Error(`User not found: ${idUser}`);
      }

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
    } catch (error) {
      console.error('getUserStudyPlan error:', error);
      throw error;
    }
  }

  async updateStudyPreference(idUser: string, dailyMinutesAvailable: number) {
    await this.db.userStudyPreference.upsert({
      where: { idUser },
      create: { idUser, dailyMinutesAvailable },
      update: { dailyMinutesAvailable },
    });
    return { success: true, dailyMinutesAvailable };
  }

  private async calculateAvgBand(userId: string): Promise<number> {
    const results = await this.db.userTestResult.findMany({
      where: { idUser: userId, status: 'FINISHED' },
      orderBy: { finishedAt: 'desc' },
      take: 20,
      include: { test: { select: { testType: true } } }
    });

    const skillBands: Record<string, number[]> = { LISTENING: [], READING: [], WRITING: [], SPEAKING: [] };
    for (const r of results) {
      if (r.bandScore > 0) skillBands[r.test.testType].push(r.bandScore);
    }

    const allBands = Object.values(skillBands).flat();
    return allBands.length > 0
      ? Math.round((allBands.reduce((a, b) => a + b, 0) / allBands.length) * 10) / 10
      : 5.0;
  }

  private async calculateVocabMastery(userId: string): Promise<VocabStats> {
    const vocabs = await this.db.vocabulary.groupBy({
      by: ['status'],
      where: { idUser: userId },
      _count: true
    });

    const stats: VocabStats = { totalWords: 0, mastered: 0, learning: 0, new: 0 };
    for (const v of vocabs) {
      stats.totalWords += v._count;
      if (v.status === 'mastered') stats.mastered = v._count;
      else if (v.status === 'learning') stats.learning = v._count;
      else stats.new += v._count; // 'new' or 'review'
    }

    return stats;
  }

  private async calculateGrammarProficiency(userId: string): Promise<GrammarStats> {
    const proficiencies = await this.db.userGrammarProficiency.groupBy({
      by: ['proficiency'],
      where: { idUser: userId },
      _count: true
    });

    const stats: GrammarStats = { total: 0, strong: 0, medium: 0, weak: 0, unknown: 0 };
    for (const p of proficiencies) {
      stats.total += p._count;
      if (p.proficiency in stats) {
        stats[p.proficiency as keyof GrammarStats] = p._count;
      }
    }

    return stats;
  }

  private async calculateCompletionRate(userId: string, weeks: number = 2): Promise<number> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (weeks * 7));
    startDate.setHours(0, 0, 0, 0);

    const completions = await this.db.userDailyTaskCompletion.count({
      where: {
        idUser: userId,
        date: { gte: startDate },
        completed: true
      }
    });

    const totalTasks = weeks * 5 * 6; // weeks * days * avg tasks per day
    return Math.min(1, completions / totalTasks);
  }

  async calculateUserProficiency(userId: string): Promise<UserProficiency> {
    const [avgBand, vocabStats, grammarStats, completionRate] = await Promise.all([
      this.calculateAvgBand(userId),
      this.calculateVocabMastery(userId),
      this.calculateGrammarProficiency(userId),
      this.calculateCompletionRate(userId)
    ]);

    // Determine stage based on band
    let stage: Stage;
    if (avgBand < 5.0) stage = Stage.FOUNDATION;
    else if (avgBand < 6.0) stage = Stage.SKILL_BUILDING;
    else if (avgBand < 7.0) stage = Stage.INTEGRATION;
    else stage = Stage.EXAM_PREP;

    // Calculate readiness score (0-100)
    const bandScore = Math.min(100, (avgBand / 9) * 100);
    const vocabScore = Math.min(100, (vocabStats.mastered / 300) * 100);
    const grammarScore = grammarStats.total > 0
      ? Math.min(100, ((grammarStats.medium + grammarStats.strong * 2) / (grammarStats.total * 2)) * 100)
      : 0;
    const completionScore = completionRate * 100;

    const readinessScore = Math.round(
      bandScore * 0.4 + vocabScore * 0.25 + grammarScore * 0.2 + completionScore * 0.15
    );

    return { avgBand, stage, vocabStats, grammarStats, completionRate, readinessScore };
  }

  async canTransition(userId: string, targetStage: Stage): Promise<boolean> {
    const prof = await this.calculateUserProficiency(userId);
    const transition = STAGE_TRANSITIONS.find(t => t.to === targetStage);

    if (!transition) return false;

    // Check band
    if (prof.avgBand < transition.conditions.minAvgBand) return false;

    // Check vocab
    if (prof.vocabStats.mastered < transition.conditions.minVocabMastered) return false;

    // Check grammar
    const grammarLevel = prof.grammarStats.total > 0
      ? (prof.grammarStats.strong > prof.grammarStats.weak ? "strong" : "medium")
      : "unknown";
    if (grammarLevel !== transition.conditions.minGrammarProficiency &&
        grammarLevel !== "strong") return false;

    // Check completion rate
    if (prof.completionRate < transition.conditions.minCompletionRate) return false;

    // Check weeks in stage
    const preference = await this.db.userStudyPreference.findUnique({
      where: { idUser: userId }
    });
    if ((preference?.weeksInCurrentStage || 0) < transition.conditions.minWeeksInStage) return false;

    return true;
  }

  async calculateStageProgress(userId: string): Promise<StageProgress> {
    const prof = await this.calculateUserProficiency(userId);
    const currentStage = prof.stage;

    const preference = await this.db.userStudyPreference.findUnique({
      where: { idUser: userId }
    });
    const weeksInStage = preference?.weeksInCurrentStage || 0;

    const transition = STAGE_TRANSITIONS.find(t => t.from === currentStage);
    const nextMilestone = transition ? {
      stage: transition.to,
      requirements: [
        `Band ≥ ${transition.conditions.minAvgBand}`,
        `Vocab mastered ≥ ${transition.conditions.minVocabMastered}`,
        `Grammar: ${transition.conditions.minGrammarProficiency}+`,
        `Completion rate ≥ ${transition.conditions.minCompletionRate * 100}%`
      ],
      currentValues: {
        avgBand: prof.avgBand,
        vocabMastered: prof.vocabStats.mastered,
        completionRate: Math.round(prof.completionRate * 100)
      }
    } : null;

    return {
      currentStage,
      weeksInStage,
      stageProgressPercent: Math.min(100, Math.round((prof.readinessScore + weeksInStage * 10) / 2)),
      readinessScore: prof.readinessScore,
      nextMilestone
    };
  }

  getWeeklyTheme(stage: Stage, weekNumber: number): { theme: string; description: string } {
    const config = STAGE_CONFIGS[stage];
    return config.themes[weekNumber % config.themes.length];
  }

  private async getWeakSkills(userId: string, limit: number = 2): Promise<{ input: string[]; output: string[] }> {
    const results = await this.db.userTestResult.findMany({
      where: { idUser: userId, status: 'FINISHED' },
      orderBy: { finishedAt: 'desc' },
      take: 20,
      include: { test: { select: { testType: true } } }
    });

    const skillBands: Record<string, { sum: number; count: number }> = {
      LISTENING: { sum: 0, count: 0 },
      READING: { sum: 0, count: 0 },
      WRITING: { sum: 0, count: 0 },
      SPEAKING: { sum: 0, count: 0 }
    };

    for (const r of results) {
      const skill = r.test.testType;
      if (r.bandScore > 0) {
        skillBands[skill].sum += r.bandScore;
        skillBands[skill].count += 1;
      }
    }

    const avgBands = Object.entries(skillBands)
      .map(([skill, data]) => ({ skill, avg: data.count > 0 ? data.sum / data.count : 5.0 }))
      .sort((a, b) => a.avg - b.avg);

    const input = avgBands.filter(s => s.skill === 'READING' || s.skill === 'LISTENING').slice(0, limit).map(s => s.skill);
    const output = avgBands.filter(s => s.skill === 'WRITING' || s.skill === 'SPEAKING').slice(0, limit).map(s => s.skill);

    return { input, output };
  }
}
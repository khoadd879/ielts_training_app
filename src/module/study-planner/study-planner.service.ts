import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef, Scope } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { DatabaseService } from 'src/database/database.service';
import { CalculatePlanDto } from './dto/calculate-plan.dto';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { SystemConfigService } from 'src/module/system-config/system-config.service';

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
  avgBand: number | null;
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
    currentValues: Record<string, number | null>;
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
  currentBand: number | null;  // null = needs placement test
  targetBand: number | null;   // null = needs to set target
  daysUntilExam: number | null;  // null = no exam date set
  maxPossibleGain: number;
  dailyMinutes: number | null;  // null = no preference set
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
  // Stage info fields
  userProficiency: UserProficiency;
  currentStage: Stage;
  stageProgress: StageProgress;
  stageTheme: string;
  stageThemeDescription: string;
  stageNextMilestone?: { stage: string; requirements: string[] };
  // Missing skills info
  missingSkills?: string[];
  missingSkillsWarning?: string;
  assessedSkills?: { skill: string; band: number | null }[];
}

interface FourStrandBalance {
  input: number;
  output: number;
  language: number;
  fluency: number;
}

@Injectable({ scope: Scope.REQUEST })
export class StudyPlannerService {
  private readonly requestCache = new Map<string, { input: string[]; output: string[] }>();

  constructor(
    private readonly db: DatabaseService,
    @Inject(CACHE_MANAGER) private cache: Cache,
    private readonly systemConfigService: SystemConfigService,
  ) {}

  /**
   * Calculate realistic target and generate study plan
   * Based on research-based band improvement rates
   */
  async calculatePlan(dto: CalculatePlanDto): Promise<StudyPlan> {
    console.log('[StudyPlannerService] calculatePlan called with:', JSON.stringify(dto));
    try {
    const { idUser, currentBand, targetBand: rawTargetBand, daysUntilExam, studyMinutesPerDay = 120 } = dto;
    let targetBand = rawTargetBand;

    // Persist user preferences so subsequent /plan calls don't return empty.
    // Compute targetExamDate from daysUntilExam (today + days). Save studyMinutesPerDay.
    if (idUser) {
      const updateData: { targetBandScore?: number; targetExamDate?: Date; } = {};
      if (targetBand != null) updateData.targetBandScore = targetBand;
      if (daysUntilExam != null) {
        const exam = new Date();
        exam.setDate(exam.getDate() + daysUntilExam);
        exam.setHours(0, 0, 0, 0);
        updateData.targetExamDate = exam;
      }
      if (Object.keys(updateData).length > 0) {
        await this.db.user.update({ where: { idUser }, data: updateData }).catch(() => null);
      }
      if (studyMinutesPerDay != null) {
        await this.db.userStudyPreference.upsert({
          where: { idUser },
          create: { idUser, dailyMinutesAvailable: studyMinutesPerDay },
          update: { dailyMinutesAvailable: studyMinutesPerDay },
        }).catch(() => null);
      }
      // Invalidate /plan cache so next fetch sees the saved preferences.
      await this.cache.del(`study-plan:${idUser}:6`).catch(() => null);
      await this.cache.del(`study-plan:${idUser}:3`).catch(() => null);
    }

    // Validate required fields
    if (currentBand === null || currentBand === undefined) {
      throw new BadRequestException('Placement test required. Please take the assessment to determine your current band.');
    }
    // If targetBand is null, use currentBand (user needs to set target manually later)
    if (targetBand === null || targetBand === undefined) {
      targetBand = currentBand;
    }
    if (daysUntilExam === null || daysUntilExam === undefined) {
      throw new BadRequestException('Target exam date required. Please set your exam date in settings.');
    }
    if (studyMinutesPerDay === null || studyMinutesPerDay === undefined) {
      targetBand = currentBand; // Also fallback for undefined
    }

    const bandGap = targetBand - currentBand;

    // Calculate max possible gain based on research rates
    const maxMonthlyRate = this.getMaxMonthlyRate(currentBand);
    const monthsUntilExam = daysUntilExam / 30;
    const maxPossibleGain = maxMonthlyRate * monthsUntilExam;

    // Get user proficiency and skill bands for priority calculation
    const prof = await this.calculateUserProficiency(dto.idUser);
    const skillBands = await this.getSkillBands(dto.idUser, dto.historyMonths || 6);

    // Calculate 4-strand balance with priority-based ratios
    const minutes = studyMinutesPerDay ?? 120;
    const fourStrandBalance = await this.calculateFourStrandBalance(minutes, prof.stage, skillBands);

    // Calculate time validation
    const timeValidation = this.validateTime(currentBand, targetBand, daysUntilExam, minutes);

    // Check if target is realistic (allow 1.5x for challenging but possible)
    const isRealistic = bandGap <= maxPossibleGain * 1.5;

    // Generate daily tasks
    console.log('[StudyPlannerService] Calling calculateUserProficiency for:', dto.idUser);
    console.log('[StudyPlannerService] Prof result:', JSON.stringify(prof));
    const theme = this.getWeeklyTheme(prof.stage, Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000)));
    console.log('[StudyPlannerService] Theme:', JSON.stringify(theme));
    const today = new Date();
    const todayDayIndex = (today.getDay() + 6) % 7; // 0=Mon, 6=Sun
    const todayDateStr = today.toISOString().split('T')[0];
    const todayCompletions = await this.db.userDailyTaskCompletion.findMany({
      where: {
        idUser: dto.idUser,
        date: today,
        completed: true
      },
      select: { taskType: true }
    });
    const todayCompletedTypes = new Set(todayCompletions.map(c => c.taskType.toUpperCase()));
    const dailyTasks = (await this.generateDailyTasks(dto.idUser, prof.stage, theme.theme, minutes, todayDayIndex))
      .map(t => ({ ...t, completed: todayCompletedTypes.has(t.type) }));
    console.log('[StudyPlannerService] Daily tasks count:', dailyTasks.length, 'date:', todayDateStr);

    // Generate weekly plan
    const weeklyPlan = await this.generateWeeklyPlan(dto.idUser, minutes, prof.stage, 0);
    console.log('[StudyPlannerService] Weekly plan count:', weeklyPlan.length);

    // Generate response
    const stageProgress = await this.calculateStageProgress(dto.idUser);
    console.log('[StudyPlannerService] Stage progress:', JSON.stringify(stageProgress));

    const plan: StudyPlan = {
      isRealistic,
      currentBand,
      targetBand,
      daysUntilExam,
      maxPossibleGain,
      dailyMinutes: minutes,
      timeValidation,
      dailyTasks,
      weeklyPlan,
      fourStrandBalance,
      difficultyLevel: this.determineDifficultyLevel(currentBand, targetBand),
      motivationTips: this.generateMotivationTips(currentBand, targetBand, daysUntilExam),
      metacognitivePrompts: this.generateMetacognitivePrompts(),
      recommendation: this.getRecommendation(minutes, currentBand, targetBand),
      userProficiency: prof,
      currentStage: prof.stage,
      stageProgress,
      stageTheme: theme.theme,
      stageThemeDescription: theme.description,
      stageNextMilestone: stageProgress.nextMilestone ? {
        stage: stageProgress.nextMilestone.stage,
        requirements: stageProgress.nextMilestone.requirements
      } : undefined,
    };

    if (!isRealistic) {
      plan.warning = this.generateWarning(currentBand, targetBand, daysUntilExam, maxPossibleGain);
      plan.adjustedTarget = Math.min(targetBand, currentBand + maxPossibleGain);
    }

    return plan;
    } catch (error) {
      console.error('[StudyPlannerService] calculatePlan error:', error);
      throw error;
    }
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

  private async calculateFourStrandBalance(
    dailyMinutes: number,
    stage: Stage,
    skillBands: Record<string, number[]>,
  ): Promise<FourStrandBalance> {
    const config = await this.systemConfigService.getStudyPlannerConfig().catch(() => null);
    const vocabMinutes = config?.vocabMinutes ?? 8;
    const grammarFloorMinutes = config?.grammarFloorMinutes ?? 5;

    const grammarPercent = await this.getGrammarPercent(stage);
    const grammarMinutes = Math.max(grammarFloorMinutes, Math.round(dailyMinutes * grammarPercent / 100));
    const practiceMinutes = Math.max(0, dailyMinutes - vocabMinutes - grammarMinutes);

    // Calculate priority weights based on skill bands (weakest gets highest priority)
    const weights = this.getPriorityWeights(skillBands);
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

    // Distribute practice time across skills
    const skillMinutes: Record<string, number> = {};
    for (const [skill, weight] of Object.entries(weights)) {
      skillMinutes[skill] = Math.round(practiceMinutes * weight / totalWeight);
    }

    // Group into strands
    const input = (skillMinutes['READING'] || 0) + (skillMinutes['LISTENING'] || 0);
    const output = (skillMinutes['WRITING'] || 0) + (skillMinutes['SPEAKING'] || 0);

    return {
      input,
      output,
      language: vocabMinutes + grammarMinutes,
      fluency: practiceMinutes - input - output,
    };
  }

  private async getGrammarPercent(stage: Stage): Promise<number> {
    try {
      const config = await this.systemConfigService.getStudyPlannerConfig();
      return config.grammarPercentByStage?.[stage] ?? this.getDefaultGrammarPercent(stage);
    } catch {
      return this.getDefaultGrammarPercent(stage);
    }
  }

  private getDefaultGrammarPercent(stage: Stage): number {
    switch (stage) {
      case Stage.FOUNDATION: return 25;
      case Stage.SKILL_BUILDING: return 18;
      case Stage.INTEGRATION: return 13;
      case Stage.EXAM_PREP: return 10;
      default: return 15;
    }
  }

  private getPriorityWeights(skillBands: Record<string, number[]>): Record<string, number> {
    // Calculate average band for each skill
    const skillAvgs: { skill: string; avg: number }[] = [];
    for (const [skill, bands] of Object.entries(skillBands)) {
      if (bands.length > 0) {
        const avg = bands.reduce((a, b) => a + b, 0) / bands.length;
        skillAvgs.push({ skill, avg });
      }
    }

    // Sort by band (lowest first = highest priority)
    skillAvgs.sort((a, b) => a.avg - b.avg);

    // Assign weights based on count
    const weights: Record<string, number> = {};
    const count = skillAvgs.length;

    if (count === 0) {
      return { READING: 25, LISTENING: 25, WRITING: 25, SPEAKING: 25 };
    }

    if (count === 1) {
      weights[skillAvgs[0].skill] = 100;
    } else if (count === 2) {
      weights[skillAvgs[0].skill] = 50;
      weights[skillAvgs[1].skill] = 50;
    } else if (count === 3) {
      weights[skillAvgs[0].skill] = 40;
      weights[skillAvgs[1].skill] = 30;
      weights[skillAvgs[2].skill] = 30;
    } else {
      weights[skillAvgs[0].skill] = 40;
      weights[skillAvgs[1].skill] = 30;
      weights[skillAvgs[2].skill] = 20;
      weights[skillAvgs[3].skill] = 10;
    }

    return weights;
  }

  private async getSkillBands(userId: string, historyMonths: number = 6): Promise<Record<string, number[]>> {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - historyMonths);

    const results = await this.db.userTestResult.findMany({
      where: {
        idUser: userId,
        status: 'FINISHED',
        finishedAt: { gte: cutoffDate }
      },
      include: { test: { select: { testType: true } } },
    });

    const skillMap: Record<string, number[]> = {
      READING: [],
      LISTENING: [],
      WRITING: [],
      SPEAKING: [],
    };

    for (const r of results) {
      if (r.bandScore && r.bandScore > 0 && skillMap[r.test.testType]) {
        skillMap[r.test.testType].push(r.bandScore);
      }
    }

    return skillMap;
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
  totalMinutes: number,
  dayIndex: number = 0
): Promise<DailyTask[]> {
  const tasks: DailyTask[] = [];
  const prof = await this.calculateUserProficiency(userId);

  // Determine if user has actual history
  const hasActualHistory = prof.avgBand !== null || prof.vocabStats.totalWords > 0 || prof.grammarStats.total > 0;

  // Get weak skills (empty if no history)
  const weakSkills = hasActualHistory ? await this.getWeakSkills(userId, 2) : { input: [], output: [] };

  // Get strand config for stage
  const strandConfig = STAGE_CONFIGS[stage].fourStrandBalance;

  // Calculate minutes per strand
  const inputMinutes = Math.round(totalMinutes * strandConfig.input / 100);
  const outputMinutes = Math.round(totalMinutes * strandConfig.output / 100);
  const languageMinutes = Math.round(totalMinutes * strandConfig.language / 100);
  const fluencyMinutes = Math.round(totalMinutes * strandConfig.fluency / 100);

  // Pick skill per day from weakSkills (rotate through available skills)
  const pickInput = weakSkills.input[dayIndex % Math.max(1, weakSkills.input.length)] ?? 'READING';
  const pickOutput = weakSkills.output[dayIndex % Math.max(1, weakSkills.output.length)] ?? 'SPEAKING';
  const pickInputAlt = weakSkills.input[(dayIndex + 1) % Math.max(1, weakSkills.input.length)] ?? 'LISTENING';
  const pickOutputAlt = weakSkills.output[(dayIndex + 1) % Math.max(1, weakSkills.output.length)] ?? 'WRITING';

  // Day-of-week rotation pattern (0=Mon ... 5=Sat, 6=Sun=rest)
  // Mon=input, Tue=output, Wed=language(vocab+grammar), Thu=alt input, Fri=alt output, Sat=review
  const dayPattern = dayIndex % 7;

  // For new users without history - rotate foundational tasks by day
  if (!hasActualHistory) {
    if (dayPattern === 0) {
      // Monday: vocab + reading foundation
      if (languageMinutes >= 10) tasks.push(this.createVocabTask(15));
      if (inputMinutes >= 15) tasks.push(await this.createInputTask('READING', theme, 20, 5.0));
    } else if (dayPattern === 1) {
      // Tuesday: speaking + listening foundation
      if (outputMinutes >= 10) tasks.push(await this.createOutputTask('SPEAKING', theme, 15, 5.0));
      if (inputMinutes >= 10) tasks.push(await this.createInputTask('LISTENING', theme, 15, 5.0));
    } else if (dayPattern === 2) {
      // Wednesday: vocab + basic grammar
      if (languageMinutes >= 10) {
        tasks.push(this.createVocabTask(15));
        tasks.push(await this.createBasicGrammarTask(10));
      }
    } else if (dayPattern === 3) {
      // Thursday: writing + reading
      if (outputMinutes >= 10) tasks.push(await this.createOutputTask('WRITING', theme, 15, 5.0));
      if (inputMinutes >= 10) tasks.push(await this.createInputTask('READING', theme, 15, 5.0));
    } else if (dayPattern === 4) {
      // Friday: listening + speaking
      if (inputMinutes >= 10) tasks.push(await this.createInputTask('LISTENING', theme, 15, 5.0));
      if (outputMinutes >= 10) tasks.push(await this.createOutputTask('SPEAKING', theme, 15, 5.0));
    } else if (dayPattern === 5) {
      // Saturday: review — vocab + fluency
      if (languageMinutes >= 10) tasks.push(this.createVocabTask(10));
      if (fluencyMinutes >= 10) tasks.push(this.createFluencyTask(stage, 10));
    }
    // dayPattern === 6 (Sunday) = rest, returns []
    return tasks;
  }

  // For users with history - rotate by day
  if (dayPattern === 0) {
    // Monday: input skill (weakest)
    if (inputMinutes > 0) {
      tasks.push(await this.createInputTask(pickInput, theme, Math.min(inputMinutes, 25), prof.avgBand));
    }
  } else if (dayPattern === 1) {
    // Tuesday: output skill (weakest)
    if (outputMinutes > 0) {
      tasks.push(await this.createOutputTask(pickOutput, theme, Math.min(outputMinutes, 25), prof.avgBand));
    }
  } else if (dayPattern === 2) {
    // Wednesday: language (vocab + grammar)
    if (languageMinutes > 0 && prof.vocabStats.totalWords > 0) {
      tasks.push(this.createVocabTask(Math.min(languageMinutes - 5, 15)));
    }
    if (languageMinutes > 5) {
      const grammarWeak = await this.getGrammarWeakAreas(userId, 1);
      if (grammarWeak.length > 0) {
        tasks.push(await this.createGrammarTask(grammarWeak[0], Math.min(10, 15)));
      }
    }
  } else if (dayPattern === 3) {
    // Thursday: alt input skill
    if (inputMinutes > 0) {
      tasks.push(await this.createInputTask(pickInputAlt, theme, Math.min(inputMinutes, 25), prof.avgBand));
    }
  } else if (dayPattern === 4) {
    // Friday: alt output skill
    if (outputMinutes > 0) {
      tasks.push(await this.createOutputTask(pickOutputAlt, theme, Math.min(outputMinutes, 25), prof.avgBand));
    }
  } else if (dayPattern === 5) {
    // Saturday: review — vocab + fluency
    if (languageMinutes > 0 && prof.vocabStats.totalWords > 0) {
      tasks.push(this.createVocabTask(10));
    }
    if (fluencyMinutes >= 10) {
      tasks.push(this.createFluencyTask(stage, Math.min(fluencyMinutes, 15)));
    }
  }
  // dayPattern === 6 (Sunday) = rest, returns []

  return tasks;
}

  private async createInputTask(skill: string, theme: string, minutes: number, avgBand: number | null): Promise<DailyTask> {
  const skillLabel = skill === 'READING' ? 'đọc' : 'nghe';
  // No test history → default to medium difficulty (safe middle ground, not a fake band).
  const difficulty = avgBand === null || avgBand < 5.5 ? 'easy' : avgBand < 6.5 ? 'medium' : 'hard';

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

private async createOutputTask(skill: string, theme: string, minutes: number, avgBand: number | null): Promise<DailyTask> {
  const skillLabel = skill === 'WRITING' ? 'viết' : 'nói';
  const difficulty = avgBand === null || avgBand < 5.5 ? 'easy' : avgBand < 6.5 ? 'medium' : 'hard';

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

private async createBasicGrammarTask(minutes: number): Promise<DailyTask> {
  const grammar = await this.getBasicGrammar();
  return {
    id: `basic-grammar-${Date.now()}`,
    type: 'GRAMMAR',
    name: grammar ? `Luyện ${grammar.title}` : 'Học ngữ pháp cơ bản',
    description: grammar?.explanation?.substring(0, 50) || 'Nền tảng ngữ pháp IELTS',
    reason: 'Ngữ pháp là nền tảng cho mọi kỹ năng',
    completed: false,
    route: '/grammar',
    routeParams: { idGrammar: grammar?.idGrammar || 'basic' },
    estimatedMinutes: minutes,
    difficulty: 'easy',
    strand: 'language'
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

private async getBasicGrammar(): Promise<any | null> {
  // Get a basic grammar for new users (e.g., verb tenses or basic sentence structure)
  const grammar = await this.db.grammar.findFirst({
    where: { level: 'Low' },
    orderBy: { order: 'asc' }
  });
  return grammar;
}

private createFallbackTask(stage: Stage, minutes: number): DailyTask {
  // For very new users with no data at all
  const fallbackTaskNames: Record<Stage, string> = {
    [Stage.FOUNDATION]: 'Học từ vựng cơ bản',
    [Stage.SKILL_BUILDING]: 'Luyện đọc cơ bản',
    [Stage.INTEGRATION]: 'Luyện viết câu',
    [Stage.EXAM_PREP]: 'Luyện đề IELTS'
  };

  return {
    id: `fallback-${Date.now()}`,
    type: 'VOCABULARY',
    name: fallbackTaskNames[stage],
    description: 'Bắt đầu hành trình IELTS của bạn với bài học cơ bản',
    reason: 'Đây là những bài học nền tảng cho người mới bắt đầu',
    completed: false,
    route: '/vocabulary',
    routeParams: { mode: 'learn' },
    estimatedMinutes: minutes,
    difficulty: 'easy',
    strand: 'language'
  };
}

  private async generateWeeklyPlan(userId: string, dailyMinutes: number, stage: Stage, weekOffset: number = 0): Promise<DayPlan[]> {
  const cacheKey = `weekly:${userId}:${weekOffset}`;
  const cached = await this.cache.get<DayPlan[]>(cacheKey);
  if (cached) return cached;

  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1);

  // Get week start and end for completion query
  const weekStart = new Date(startOfWeek);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(startOfWeek);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  // Query all completions for the week in 1 query
  const allCompletions = await this.db.userDailyTaskCompletion.findMany({
    where: {
      idUser: userId,
      date: { gte: weekStart, lte: weekEnd },
      completed: true
    },
    select: { date: true, taskType: true }
  });

  // Map completions: date string → Set of taskType user already completed
  const completionMap = new Map<string, Set<string>>();
  for (const c of allCompletions) {
    const dateKey = c.date.toISOString().split('T')[0];
    if (!completionMap.has(dateKey)) completionMap.set(dateKey, new Set());
    completionMap.get(dateKey)!.add(c.taskType.toUpperCase());
  }

  const weekPlans: DayPlan[] = [];
  const theme = this.getWeeklyTheme(stage, weekOffset);

  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + dayIndex);
    const isSunday = dayIndex === 0;
    const dateStr = date.toISOString().split('T')[0];
    const completedTypes = completionMap.get(dateStr) ?? new Set<string>();

    const tasks = isSunday
      ? []
      : (await this.generateDailyTasks(userId, stage, theme.theme, dailyMinutes, dayIndex)).map((t, taskIndex) => ({
          ...t,
          id: `${t.type.toLowerCase()}-${dateStr}-${taskIndex}`,
          completed: completedTypes.has(t.type),
        }));

    const strandConfig = STAGE_CONFIGS[stage].fourStrandBalance;
    weekPlans.push({
      date: dateStr,
      dayName: dayNames[dayIndex],
      tasks,
      isRestDay: isSunday,
      completedCount: completedTypes.size,
      totalCount: tasks.length,
      strandBreakdown: {
        input: Math.round(dailyMinutes * strandConfig.input / 100),
        output: Math.round(dailyMinutes * strandConfig.output / 100),
        language: Math.round(dailyMinutes * strandConfig.language / 100),
        fluency: Math.round(dailyMinutes * strandConfig.fluency / 100)
      }
    });
  }

  // Cache for 1 minute
  await this.cache.set(cacheKey, weekPlans, 60);

  return weekPlans;

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

    // Check if user can transition to next stage
    if (dto.completed) {
      await this.checkAndTransitionStage(idUser);
    }

    // Invalidate weekly plan cache
    await this.cache.del(`weekly:${idUser}:0`);
    await this.cache.del(`weekly:${idUser}:1`);
    // Invalidate study-plan cache (any historyMonths value)
    await this.cache.del(`study-plan:${idUser}:6`);
    await this.cache.del(`study-plan:${idUser}:3`);

    return { success: true, completed: dto.completed, completedAt };
  }

  private async checkAndTransitionStage(userId: string): Promise<void> {
    const prof = await this.calculateUserProficiency(userId);
    const currentStage = prof.stage;

    // Find the transition from current stage to next
    const transition = STAGE_TRANSITIONS.find(t => t.from === currentStage);
    if (!transition) return; // Already at highest stage (EXAM_PREP)

    // Calculate weeks in current stage
    const preference = await this.db.userStudyPreference.findUnique({
      where: { idUser: userId }
    });

    let weeksInStage = 0;
    if (preference?.stageStartDate) {
      const now = new Date();
      const startDate = new Date(preference.stageStartDate);
      const daysDiff = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      weeksInStage = Math.floor(daysDiff / 7);
    }

    // Check all conditions
    const avgBandSatisfies = prof.avgBand !== null && prof.avgBand >= transition.conditions.minAvgBand;
    const canTransition =
      avgBandSatisfies &&
      prof.vocabStats.mastered >= transition.conditions.minVocabMastered &&
      this.checkGrammarLevel(prof.grammarStats, transition.conditions.minGrammarProficiency) &&
      prof.completionRate >= transition.conditions.minCompletionRate &&
      weeksInStage >= transition.conditions.minWeeksInStage;

    if (canTransition) {
      // Transition to next stage
      await this.db.userStudyPreference.update({
        where: { idUser: userId },
        data: {
          currentStage: transition.to,
          stageStartDate: new Date(),
          weeksInCurrentStage: 0
        }
      });
    }
  }

  private checkGrammarLevel(grammarStats: GrammarStats, minLevel: string): boolean {
    if (minLevel === 'weak') return true;
    if (minLevel === 'medium') {
      return grammarStats.total > 0 && (grammarStats.strong > 0 || grammarStats.medium > 0);
    }
    if (minLevel === 'strong') {
      return grammarStats.strong > grammarStats.weak;
    }
    return false;
  }

  async getUserStudyPlan(idUser: string, historyMonths: number = 6) {
    const cacheKey = `study-plan:${idUser}:${historyMonths}`;
    const cached = await this.cache.get<any>(cacheKey);
    if (cached) return cached;

    try {
      const user = await this.db.user.findUnique({ where: { idUser }, select: { targetBandScore: true, targetExamDate: true } });
      if (!user) {
        throw new NotFoundException(`User with ID ${idUser} not found`);
      }

      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - historyMonths);

      const recentResults = await this.db.userTestResult.findMany({
        where: {
          idUser,
          status: 'FINISHED',
          finishedAt: { gte: cutoffDate }
        },
        include: { test: { select: { testType: true } } },
      });

      const skillBands: Record<string, number[]> = { LISTENING: [], READING: [], WRITING: [], SPEAKING: [] };
      for (const result of recentResults) {
        const skill = result.test.testType;
        if (result.bandScore > 0) skillBands[skill].push(result.bandScore);
      }

      let currentBand: number | null = null;
      if (recentResults.length > 0) {
        const allBands = Object.values(skillBands).flat();
        if (allBands.length > 0) currentBand = Math.round((allBands.reduce((a, b) => a + b, 0) / allBands.length) * 10) / 10;
      }

      const daysUntilExam = user.targetExamDate
        ? Math.max(1, Math.ceil((user.targetExamDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : null;
      const preference = await this.db.userStudyPreference.findUnique({ where: { idUser } });
      const studyMinutesPerDay = preference?.dailyMinutesAvailable ?? null;

      // Only require currentBand to exist. targetBand can be null (user hasn't set target yet).
      if (currentBand === null) {
        return {
          isRealistic: false,
          currentBand: null,
          targetBand: user.targetBandScore,
          daysUntilExam,
          maxPossibleGain: 0,
          dailyMinutes: studyMinutesPerDay,
          dailyTasks: [],
          weeklyPlan: [],
          fourStrandBalance: { input: 0, output: 0, language: 0, fluency: 0 },
          difficultyLevel: 'standard' as const,
          motivationTips: [],
          metacognitivePrompts: [],
          recommendation: { status: 'warn', message: 'Vui lòng hoàn thành bài đánh giá trình độ để xác định band hiện tại.' },
          userProficiency: { avgBand: null, stage: Stage.FOUNDATION, vocabStats: { totalWords: 0, mastered: 0, learning: 0, new: 0 }, grammarStats: { total: 0, strong: 0, medium: 0, weak: 0, unknown: 0 }, completionRate: 0, readinessScore: 0 },
          currentStage: Stage.FOUNDATION,
          stageProgress: { currentStage: Stage.FOUNDATION, weeksInStage: 0, stageProgressPercent: 0, readinessScore: 0, nextMilestone: null },
          stageTheme: '',
          stageThemeDescription: '',
          missingSkills: ['READING', 'LISTENING', 'WRITING', 'SPEAKING'],
          missingSkillsWarning: 'Cần làm ít nhất 1 bài test để có lộ trình chuẩn.',
          assessedSkills: [],
        };
      }

      // If user has not set target band or exam date yet, return empty plan
      // so the FE shows the create-form. /calculate endpoint will only be hit
      // when the user submits the form.
      if (user.targetBandScore == null || daysUntilExam == null) {
        const emptyPlan = {
          isRealistic: false,
          currentBand,
          targetBand: user.targetBandScore,
          daysUntilExam,
          maxPossibleGain: 0,
          dailyMinutes: studyMinutesPerDay,
          dailyTasks: [],
          weeklyPlan: [],
          fourStrandBalance: { input: 0, output: 0, language: 0, fluency: 0 },
          difficultyLevel: 'standard' as const,
          motivationTips: [],
          metacognitivePrompts: [],
          recommendation: {
            status: 'warn',
            message: 'Vui lòng nhập target band và ngày thi dự kiến để tạo lộ trình.',
          },
          userProficiency: {
            avgBand: currentBand,
            stage: Stage.FOUNDATION,
            vocabStats: { totalWords: 0, mastered: 0, learning: 0, new: 0 },
            grammarStats: { total: 0, strong: 0, medium: 0, weak: 0, unknown: 0 },
            completionRate: 0,
            readinessScore: 0,
          },
          currentStage: Stage.FOUNDATION,
          stageProgress: { currentStage: Stage.FOUNDATION, weeksInStage: 0, stageProgressPercent: 0, readinessScore: 0, nextMilestone: null },
          stageTheme: '',
          stageThemeDescription: '',
          missingSkills: [],
          missingSkillsWarning: '',
          assessedSkills: [],
        };
        await this.cache.set(cacheKey, emptyPlan, 60);
        return emptyPlan;
      }

      // Call calculatePlan - if targetBand is null, it will use currentBand as target
      const plan = await this.calculatePlan({
        idUser,
        currentBand,
        targetBand: user.targetBandScore,
        daysUntilExam,
        studyMinutesPerDay,
        historyMonths,
      });

      await this.cache.set(cacheKey, plan, 60);
      return plan;
    } catch (error) {
      console.error('getUserStudyPlan error:', error);
      throw error;
    }
  }

  /**
   * Direct read of UserDailyTaskCompletion for a given day (default: today).
   * Intentionally NOT cached — this is the source-of-truth that the UI renders
   * task completion badges from. The main /plan endpoint has a 60s cache which
   * caused the "stale completed=false after submitting a test" bug.
   *
   * Returns: { date, tasks: { READING: { completed, completedAt }, ... } }
   */
  async getDailyCompletion(idUser: string, dateStr?: string) {
    const date = dateStr ? new Date(dateStr) : new Date();
    date.setHours(0, 0, 0, 0);
    const rows = await this.db.userDailyTaskCompletion.findMany({
      where: { idUser, date, completed: true },
      select: { taskType: true, completedAt: true },
    });
    const allTypes = ['READING', 'LISTENING', 'WRITING', 'SPEAKING', 'VOCABULARY', 'GRAMMAR'];
    const tasks: Record<string, { completed: boolean; completedAt: Date | null }> = {};
    for (const t of allTypes) tasks[t] = { completed: false, completedAt: null };
    for (const r of rows) {
      const key = r.taskType.toUpperCase();
      if (tasks[key]) tasks[key] = { completed: true, completedAt: r.completedAt };
    }
    return { date: date.toISOString().split('T')[0], tasks };
  }

  async updateStudyPreference(idUser: string, dailyMinutesAvailable: number) {
    await this.db.userStudyPreference.upsert({
      where: { idUser },
      create: { idUser, dailyMinutesAvailable },
      update: { dailyMinutesAvailable },
    });
    return { success: true, dailyMinutesAvailable };
  }

  private async calculateAvgBand(userId: string): Promise<{ band: number | null; hasHistory: boolean }> {
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
    return {
      band: allBands.length > 0
        ? Math.round((allBands.reduce((a, b) => a + b, 0) / allBands.length) * 10) / 10
        : null,
      hasHistory: allBands.length > 0,
    };
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
    const cacheKey = `proficiency:${userId}`;
    const cached = await this.cache.get<UserProficiency>(cacheKey);
    if (cached) return cached;

    const [avgBandResult, vocabStats, grammarStats, completionRate] = await Promise.all([
      this.calculateAvgBand(userId),
      this.calculateVocabMastery(userId),
      this.calculateGrammarProficiency(userId),
      this.calculateCompletionRate(userId)
    ]);

    const avgBand = avgBandResult.band;
    const hasTestHistory = avgBandResult.hasHistory;

    // For new users with no history, start in FOUNDATION regardless of targetBand
    // Stage is determined by actual proficiency, not target
    let stage: Stage;
    if (!hasTestHistory) {
      stage = Stage.FOUNDATION;
    } else if (avgBand !== null && avgBand < 5.0) {
      stage = Stage.FOUNDATION;
    } else if (avgBand !== null && avgBand < 6.0) {
      stage = Stage.SKILL_BUILDING;
    } else if (avgBand !== null && avgBand < 7.0) {
      stage = Stage.INTEGRATION;
    } else {
      stage = Stage.EXAM_PREP;
    }

    // Calculate readiness score (0-100)
    const bandScore = avgBand !== null ? Math.min(100, (avgBand / 9) * 100) : 0;
    const vocabScore = Math.min(100, (vocabStats.mastered / 300) * 100);
    const grammarScore = grammarStats.total > 0
      ? Math.min(100, ((grammarStats.medium + grammarStats.strong * 2) / (grammarStats.total * 2)) * 100)
      : 0;
    const completionScore = completionRate * 100;

    const readinessScore = Math.round(
      bandScore * 0.4 + vocabScore * 0.25 + grammarScore * 0.2 + completionScore * 0.15
    );

    const result = { avgBand, stage, vocabStats, grammarStats, completionRate, readinessScore };

    // Cache for 5 minutes
    await this.cache.set(`proficiency:${userId}`, result, 300);

    return result;
  }

  async canTransition(userId: string, targetStage: Stage): Promise<boolean> {
    const prof = await this.calculateUserProficiency(userId);
    const transition = STAGE_TRANSITIONS.find(t => t.to === targetStage);

    if (!transition) return false;

    // Check band
    if (prof.avgBand === null || prof.avgBand < transition.conditions.minAvgBand) return false;

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

    // Check weeks in stage (calculate from stageStartDate)
    let weeksInStage = 0;
    const preference = await this.db.userStudyPreference.findUnique({
      where: { idUser: userId }
    });
    if (preference?.stageStartDate) {
      const now = new Date();
      const startDate = new Date(preference.stageStartDate);
      const daysDiff = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      weeksInStage = Math.floor(daysDiff / 7);
    }
    if (weeksInStage < transition.conditions.minWeeksInStage) return false;

    return true;
  }

  async calculateStageProgress(userId: string): Promise<StageProgress> {
    // Verify user exists first to avoid FK constraint errors
    const userExists = await this.db.user.findUnique({ where: { idUser: userId } });
    if (!userExists) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const prof = await this.calculateUserProficiency(userId);
    const currentStage = prof.stage;

    // Check if user has any actual test history
    const hasTestHistory = prof.avgBand !== null || prof.vocabStats.totalWords > 0 || prof.grammarStats.total > 0;

    let preference = await this.db.userStudyPreference.findUnique({
      where: { idUser: userId }
    });

    // Initialize stageStartDate if not set (first access)
    if (!preference?.stageStartDate) {
      preference = await this.db.userStudyPreference.upsert({
        where: { idUser: userId },
        create: {
          idUser: userId,
          dailyMinutesAvailable: 120,
          currentStage: currentStage,
          stageStartDate: new Date(),
          weeksInCurrentStage: 0
        },
        update: {
          stageStartDate: new Date()
        }
      });
    }

    // Calculate weeks in stage based on stageStartDate
    let weeksInStage = 0;
    if (preference?.stageStartDate) {
      const now = new Date();
      const startDate = new Date(preference.stageStartDate);
      const daysDiff = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      weeksInStage = Math.floor(daysDiff / 7);
    }

    const transition = STAGE_TRANSITIONS.find(t => t.from === currentStage);

    // Calculate progress based on actual milestone requirements met
    let stageProgressPercent = 0;
    if (transition && transition.conditions) {
      const reqs = transition.conditions;
      let metCount = 0;
      let totalReqs = 4; // band, vocab, grammar, completion

      if (prof.avgBand !== null && prof.avgBand >= reqs.minAvgBand) metCount++;
      if (prof.vocabStats.mastered >= reqs.minVocabMastered) metCount++;
      // Grammar: strong = 2, medium = 1, weak/unknown = 0
      const grammarScore = prof.grammarStats.strong * 2 + prof.grammarStats.medium;
      const maxGrammarScore = (prof.grammarStats.total || 1) * 2;
      const grammarPercent = maxGrammarScore > 0 ? grammarScore / maxGrammarScore : 0;
      if (grammarPercent >= 0.75 || reqs.minGrammarProficiency === 'weak') metCount++;
      if (prof.completionRate >= reqs.minCompletionRate) metCount++;

      stageProgressPercent = Math.round((metCount / totalReqs) * 100);
    }

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

    // New users with no history start at 0% in FOUNDATION
    if (!hasTestHistory) {
      stageProgressPercent = 0;
    }

    return {
      currentStage,
      weeksInStage,
      stageProgressPercent,
      readinessScore: prof.readinessScore,
      nextMilestone
    };
  }

  getWeeklyTheme(stage: Stage, weekNumber: number): { theme: string; description: string } {
    const config = STAGE_CONFIGS[stage];
    return config.themes[weekNumber % config.themes.length];
  }

  private async getWeakSkills(userId: string, limit: number = 2): Promise<{ input: string[]; output: string[] }> {
    // Layer 1: per-request memoize
    const memoKey = `${userId}:${limit}`;
    const memoized = this.requestCache.get(memoKey);
    if (memoized) return memoized;

    // Layer 2: Redis cache
    const redisKey = `weak-skills:${memoKey}`;
    const cached = await this.cache.get<{ input: string[]; output: string[] }>(redisKey);
    if (cached) {
      this.requestCache.set(memoKey, cached);
      return cached;
    }

    // Compute
    const result = await this.computeWeakSkills(userId, limit);

    // Set both caches
    this.requestCache.set(memoKey, result);
    await this.cache.set(redisKey, result, 60);

    return result;
  }

  private async computeWeakSkills(userId: string, limit: number): Promise<{ input: string[]; output: string[] }> {
    const results = await this.db.userTestResult.findMany({
      where: { idUser: userId, status: 'FINISHED' },
      orderBy: { finishedAt: 'desc' },
      take: 20,
      include: { test: { select: { testType: true } } },
    });

    const skillBands: Record<string, { sum: number; count: number }> = {
      LISTENING: { sum: 0, count: 0 },
      READING: { sum: 0, count: 0 },
      WRITING: { sum: 0, count: 0 },
      SPEAKING: { sum: 0, count: 0 },
    };

    for (const r of results) {
      const skill = r.test.testType;
      if (r.bandScore > 0) {
        skillBands[skill].sum += r.bandScore;
        skillBands[skill].count += 1;
      }
    }

    const avgBands = Object.entries(skillBands)
      .filter(([_, data]) => data.count > 0)
      .map(([skill, data]) => ({ skill, avg: data.sum / data.count }))
      .sort((a, b) => a.avg - b.avg);

    if (avgBands.length === 0) {
      return { input: [], output: [] };
    }

    const input = avgBands
      .filter((s) => s.skill === 'READING' || s.skill === 'LISTENING')
      .slice(0, limit)
      .map((s) => s.skill);
    const output = avgBands
      .filter((s) => s.skill === 'WRITING' || s.skill === 'SPEAKING')
      .slice(0, limit)
      .map((s) => s.skill);

    return { input, output };
  }
}
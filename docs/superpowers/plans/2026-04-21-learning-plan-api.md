# Learning Plan API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng API tạo lộ trình học cá nhân hóa theo ngày/tuần dựa trên band score history, sub-skill analysis, và target exam date.

**Architecture:**
- 1 Service mới: `LearningPlanService` - phân tích weakness profile, gen plan theo ngày
- 1 Module mới: `learning-plan.module.ts`
- Mở rộng `recommend-test.service.ts` để hỗ trợ sub-skill analysis
- Dùng AI detailed feedback (TA/CC/LR/GRA cho writing, FC/LR/GRA/P cho speaking) để target cụ thể từng sub-skill
- Dùng `targetExamDate` để tính urgency và đủ practice sessions

**Tech Stack:** NestJS, Prisma, AI Feedback data (existing)

---

## File Structure

```
src/module/learning-plan/                    # NEW MODULE
  learning-plan.module.ts
  learning-plan.controller.ts
  learning-plan.service.ts
  dto/
    get-learning-plan.dto.ts
src/module/recommend-test/                   # MODIFY - add sub-skill analysis
  recommend-test.service.ts
src/module/statistics/                       # MODIFY - expose daily performance data
  statistics.service.ts
prisma/schema.prisma                         # ADD new model for LearningPlan (optional persistence)
```

---

## Task 1: Learning Plan Service - Core Algorithm

**Files:**
- Create: `src/module/learning-plan/learning-plan.service.ts`

- [ ] **Step 1: Create learning-plan.service.ts**

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';

interface SubSkillScore {
  skill: string;
  score: number;
  comment: string;
}

interface WeaknessProfile {
  overallWeakestSkill: 'LISTENING' | 'READING' | 'WRITING' | 'SPEAKING';
  subSkills: {
    skill: string;
    avgScore: number;
    weaknessLevel: 'critical' | 'moderate' | 'mild';
  }[];
  bandScoreGap: number; // targetBandScore - currentAvg
  daysRemaining: number;
  currentLevel: 'Low' | 'Mid' | 'High' | 'Great';
}

interface DayPlan {
  date: string;
  dayOfWeek: string;
  sessions: Session[];
  estimatedMinutes: number;
  focusAreas: string[];
}

interface Session {
  type: 'READING' | 'LISTENING' | 'WRITING' | 'SPEAKING' | 'VOCABULARY' | 'GRAMMAR';
  title: string;
  description: string;
  recommendedAction: string;
  priority: 'high' | 'medium' | 'low';
  targetMinutes: number;
  linkedWeakness?: string;
}

@Injectable()
export class LearningPlanService {
  constructor(private readonly db: DatabaseService) {}

  // ===== Main Entry Point =====

  async generateLearningPlan(idUser: string) {
    // 1. Get user profile
    const user = await this.db.user.findUnique({
      where: { idUser },
      select: { targetBandScore: true, targetExamDate: true },
    });

    if (!user) throw new NotFoundException('User not found');

    // 2. Build weakness profile
    const weaknessProfile = await this.buildWeaknessProfile(idUser);

    // 3. Get available tests for recommendation
    const recommendedTests = await this.getRecommendedTestsForPlan(idUser, weaknessProfile);

    // 4. Generate week plan
    const weekPlan = this.generateWeekPlan(weaknessProfile, recommendedTests);

    return {
      weaknessProfile: {
        weakestSkill: weaknessProfile.overallWeakestSkill,
        subSkills: weaknessProfile.subSkills.filter(s => s.weaknessLevel === 'critical'),
        bandGap: weaknessProfile.bandScoreGap,
        daysRemaining: weaknessProfile.daysRemaining,
        currentLevel: weaknessProfile.currentLevel,
      },
      weeklyPlan: weekPlan,
    };
  }

  // ===== Build Weakness Profile =====

  private async buildWeaknessProfile(idUser: string): Promise<WeaknessProfile> {
    // Get all test results for R/L band scores
    const testResults = await this.db.userTestResult.findMany({
      where: { idUser, status: 'FINISHED' },
      orderBy: { finishedAt: 'desc' },
      take: 30, // Last 30 tests
    });

    // Calculate per-skill averages for R/L
    const skillTotals: Record<string, { sum: number; count: number }> = {
      LISTENING: { sum: 0, count: 0 },
      READING: { sum: 0, count: 0 },
      WRITING: { sum: 0, count: 0 },
      SPEAKING: { sum: 0, count: 0 },
    };

    for (const result of testResults) {
      const test = await this.db.test.findUnique({
        where: { idTest: result.idTest },
        select: { testType: true },
      });
      if (test && result.bandScore > 0) {
        skillTotals[test.testType].sum += result.bandScore;
        skillTotals[test.testType].count += 1;
      }
    }

    // Get AI grading sub-skills for W/S
    const writingSubmissions = await this.db.userWritingSubmission.findMany({
      where: { idUser, aiGradingStatus: 'COMPLETED' },
      orderBy: { gradedAt: 'desc' },
      take: 10,
    });

    const speakingSubmissions = await this.db.userSpeakingSubmission.findMany({
      where: { idUser, aiGradingStatus: 'COMPLETED' },
      orderBy: { gradedAt: 'desc' },
      take: 10,
    });

    // Calculate W/S sub-skill averages from AI feedback
    const wSubSkills = this.aggregateWritingSubSkills(writingSubmissions);
    const sSubSkills = this.aggregateSpeakingSubSkills(speakingSubmissions);

    // Find overall weakest skill
    let overallWeakestSkill: WeaknessProfile['overallWeakestSkill'] = 'READING';
    let lowestAvg = 10;

    for (const [skill, data] of Object.entries(skillTotals)) {
      if (data.count > 0) {
        const avg = data.sum / data.count;
        if (avg < lowestAvg) {
          lowestAvg = avg;
          overallWeakestSkill = skill as WeaknessProfile['overallWeakestSkill'];
        }
      }
    }

    // Calculate band score gap
    const currentOverallAvg = Object.values(skillTotals)
      .filter(d => d.count > 0)
      .reduce((sum, d) => sum + d.sum / d.count, 0) / 4;

    const targetBand = 7.0; // Default if not set
    const bandScoreGap = Math.max(0, targetBand - currentOverallAvg);

    // Days remaining
    const user = await this.db.user.findUnique({
      where: { idUser },
      select: { targetExamDate: true },
    });

    const daysRemaining = user?.targetExamDate
      ? Math.max(0, Math.ceil((user.targetExamDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : 30; // Default 30 days if no exam date

    return {
      overallWeakestSkill,
      subSkills: [...Object.entries(wSubSkills), ...Object.entries(sSubSkills)].map(([skill, avg]) => ({
        skill,
        avgScore: avg as number,
        weaknessLevel: this.calculateWeaknessLevel(avg as number),
      })),
      bandScoreGap,
      daysRemaining,
      currentLevel: this.mapScoreToLevel(currentOverallAvg),
    };
  }

  private aggregateWritingSubSkills(submissions: any[]): Record<string, number[]> {
    const totals: Record<string, number> = { TA: 0, CC: 0, LR: 0, GRA: 0 };
    let count = 0;

    for (const sub of submissions) {
      if (sub.aiDetailedFeedback) {
        const fb = sub.aiDetailedFeedback as Record<string, { score: number }>;
        if (fb.taskAchievement) totals.TA += fb.taskAchievement.score;
        if (fb.coherenceAndCohesion) totals.CC += fb.coherenceAndCohesion.score;
        if (fb.lexicalResource) totals.LR += fb.lexicalResource.score;
        if (fb.grammaticalRangeAndAccuracy) totals.GRA += fb.grammaticalRangeAndAccuracy.score;
        count++;
      }
    }

    return count > 0
      ? {
          'Writing: Task Achievement': totals.TA / count,
          'Writing: Coherence & Cohesion': totals.CC / count,
          'Writing: Lexical Resource': totals.LR / count,
          'Writing: Grammar': totals.GRA / count,
        }
      : {};
  }

  private aggregateSpeakingSubSkills(submissions: any[]): Record<string, number[]> {
    const totals: Record<string, number> = { FC: 0, LR: 0, GRA: 0, P: 0 };
    let count = 0;

    for (const sub of submissions) {
      if (sub.aiDetailedFeedback) {
        const fb = sub.aiDetailedFeedback as Record<string, { score: number }>;
        if (fb.fluencyAndCoherence) totals.FC += fb.fluencyAndCoherence.score;
        if (fb.lexicalResource) totals.LR += fb.lexicalResource.score;
        if (fb.grammaticalRangeAndAccuracy) totals.GRA += fb.grammaticalRangeAndAccuracy.score;
        if (fb.pronunciation) totals.P += fb.pronunciation.score;
        count++;
      }
    }

    return count > 0
      ? {
          'Speaking: Fluency': totals.FC / count,
          'Speaking: Lexical Resource': totals.LR / count,
          'Speaking: Grammar': totals.GRA / count,
          'Speaking: Pronunciation': totals.P / count,
        }
      : {};
  }

  private calculateWeaknessLevel(score: number): 'critical' | 'moderate' | 'mild' {
    if (score < 5.5) return 'critical';
    if (score < 6.5) return 'moderate';
    return 'mild';
  }

  private mapScoreToLevel(avgScore: number): 'Low' | 'Mid' | 'High' | 'Great' {
    if (avgScore < 4.0) return 'Low';
    if (avgScore < 6.0) return 'Mid';
    if (avgScore < 7.5) return 'High';
    return 'Great';
  }

  // ===== Get Recommended Tests =====

  private async getRecommendedTestsForPlan(idUser: string, profile: WeaknessProfile) {
    // Get tests matching weakest skill and level
    const tests = await this.db.test.findMany({
      where: {
        testType: profile.overallWeakestSkill as any,
        level: profile.currentLevel,
      },
      take: 10,
    });

    return tests.map(t => ({
      idTest: t.idTest,
      title: t.title,
      testType: t.testType,
      duration: t.duration,
      numberQuestion: t.numberQuestion,
    }));
  }

  // ===== Generate Week Plan =====

  private generateWeekPlan(profile: WeaknessProfile, recommendedTests: any[]): DayPlan[] {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const plan: DayPlan[] = [];

    // Interleaving pattern: mix skills for better retention
    const dailyFocus = this.decideDailyFocus(profile);

    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);

      const dayPlan = this.createDayPlan(
        days[date.getDay() === 0 ? 6 : date.getDay() - 1],
        date.toISOString().split('T')[0],
        dailyFocus[i % dailyFocus.length],
        recommendedTests,
        profile,
      );

      plan.push(dayPlan);
    }

    return plan;
  }

  private decideDailyFocus(profile: WeaknessProfile): ('READING' | 'LISTENING' | 'WRITING' | 'SPEAKING' | 'VOCABULARY')[] {
    // Interleaved practice: alternate between receptive (R/L) and productive (W/S)
    const basePattern: ('READING' | 'LISTENING' | 'WRITING' | 'SPEAKING' | 'VOCABULARY')[] = [
      'READING',
      'WRITING',
      'LISTENING',
      'SPEAKING',
      'VOCABULARY',
      'READING',
      'WRITING',
    ];

    // Boost weakest skill frequency
    if (profile.overallWeakestSkill === 'WRITING') {
      basePattern[1] = 'WRITING';
      basePattern[6] = 'WRITING';
    } else if (profile.overallWeakestSkill === 'SPEAKING') {
      basePattern[3] = 'SPEAKING';
    } else if (profile.overallWeakestSkill === 'READING') {
      basePattern[0] = 'READING';
      basePattern[5] = 'READING';
    }

    return basePattern;
  }

  private createDayPlan(
    dayName: string,
    dateStr: string,
    focusSkill: 'READING' | 'LISTENING' | 'WRITING' | 'SPEAKING' | 'VOCABULARY',
    availableTests: any[],
    profile: WeaknessProfile,
  ): DayPlan {
    const sessions: Session[] = [];

    switch (focusSkill) {
      case 'WRITING':
        sessions.push(this.createWritingSession(profile));
        break;
      case 'SPEAKING':
        sessions.push(this.createSpeakingSession(profile));
        break;
      case 'READING':
      case 'LISTENING':
        sessions.push(this.createReadingListeningSession(focusSkill, availableTests, profile));
        break;
      case 'VOCABULARY':
        sessions.push(this.createVocabSession(profile));
        break;
    }

    const totalMinutes = sessions.reduce((sum, s) => sum + s.targetMinutes, 0);

    return {
      date: dateStr,
      dayOfWeek: dayName,
      sessions,
      estimatedMinutes: totalMinutes,
      focusAreas: sessions.map(s => s.type),
    };
  }

  private createWritingSession(profile: WeaknessProfile): Session {
    // Find weakest writing sub-skill
    const wSubSkills = profile.subSkills.filter(s => s.skill.startsWith('Writing:'));
    const weakestSubSkill = wSubSkills.sort((a, b) => a.avgScore - b.avgScore)[0];

    const subSkillGuidance: Record<string, string> = {
      'Writing: Task Achievement':
        'Focus on addressing ALL parts of the prompt. Make sure your overview clearly identifies the main features/trends.',
      'Writing: Coherence & Cohesion':
        'Work on linking ideas with transition phrases. Use paragraphing to organize distinct ideas.',
      'Writing: Lexical Resource':
        'Learn more sophisticated vocabulary. Avoid repetition, use precise word choices.',
      'Writing: Grammar':
        'Practice using complex sentence structures. Focus on subject-verb agreement and article usage.',
    };

    return {
      type: 'WRITING',
      title: `Writing Practice - ${weakestSubSkill?.skill.replace('Writing: ', '') || 'General'}`,
      description: subSkillGuidance[weakestSubSkill?.skill || ''] || 'Practice a writing task under timed conditions',
      recommendedAction: weakestSubSkill?.skill
        ? `Focus on ${weakestSubSkill.skill.replace('Writing: ', '').toLowerCase()} in your response`
        : 'Complete a full Task 1 or Task 2 essay',
      priority: 'high',
      targetMinutes: 60,
      linkedWeakness: weakestSubSkill?.skill,
    };
  }

  private createSpeakingSession(profile: WeaknessProfile): Session {
    const sSubSkills = profile.subSkills.filter(s => s.skill.startsWith('Speaking:'));
    const weakestSubSkill = sSubSkills.sort((a, b) => a.avgScore - b.avgScore)[0];

    const subSkillGuidance: Record<string, string> = {
      'Speaking: Fluency':
        'Practice speaking without long pauses. Use circumlocution when you don\'t know a word.',
      'Speaking: Lexical Resource':
        'Expand vocabulary for common topics. Use synonyms and collocations naturally.',
      'Speaking: Grammar':
        'Focus on using a range of tenses accurately. Practice complex sentence structures.',
      'Speaking: Pronunciation':
        'Practice stress patterns and intonation. Record yourself and compare with native speakers.',
    };

    return {
      type: 'SPEAKING',
      title: `Speaking Practice - ${weakestSubSkill?.skill.replace('Speaking: ', '') || 'General'}`,
      description: subSkillGuidance[weakestSubSkill?.skill || ''] || 'Practice speaking under exam conditions',
      recommendedAction: weakestSubSkill?.skill
        ? `Focus on ${weakestSubSkill.skill.replace('Speaking: ', '').toLowerCase()}`
        : 'Complete a full speaking test',
      priority: 'high',
      targetMinutes: 30,
      linkedWeakness: weakestSubSkill?.skill,
    };
  }

  private createReadingListeningSession(
    skill: 'READING' | 'LISTENING',
    availableTests: any[],
    profile: WeaknessProfile,
  ): Session {
    const relevantTests = availableTests.filter(t => t.testType === skill);
    const test = relevantTests[0];

    return {
      type: skill,
      title: `${skill} Practice`,
      description: test
        ? `Complete ${test.title} (${test.numberQuestion} questions, ${Math.round(test.duration / 60)} min)`
        : `Practice ${skill} under timed conditions`,
      recommendedAction: test
        ? `Take the ${test.title} test`
        : `Find a ${skill} practice test`,
      priority: 'medium',
      targetMinutes: skill === 'LISTENING' ? 40 : 60,
    };
  }

  private createVocabSession(profile: WeaknessProfile): Session {
    return {
      type: 'VOCABULARY',
      title: 'Vocabulary Building',
      description: 'Review and learn new vocabulary with spaced repetition',
      recommendedAction: 'Complete 20 vocabulary exercises and add 5 new words to your list',
      priority: 'medium',
      targetMinutes: 30,
    };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/module/learning-plan/learning-plan.service.ts
git commit -m "feat: add learning plan service with weakness profile analysis"
```

---

## Task 2: Learning Plan Controller

**Files:**
- Create: `src/module/learning-plan/learning-plan.controller.ts`

- [ ] **Step 1: Create controller**

```typescript
import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/passport/jwt-auth.guard';
import { LearningPlanService } from './learning-plan.service';

@Controller('learning-plan')
@UseGuards(JwtAuthGuard)
export class LearningPlanServiceController {
  constructor(private readonly learningPlanService: LearningPlanService) {}

  @Get()
  async getLearningPlan(@Request() req: any) {
    const { idUser } = req.user;
    return this.learningPlanService.generateLearningPlan(idUser);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/module/learning-plan/learning-plan.controller.ts
git commit -m "feat: add learning plan controller"
```

---

## Task 3: Learning Plan Module

**Files:**
- Create: `src/module/learning-plan/learning-plan.module.ts`

- [ ] **Step 1: Create module**

```typescript
import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { LearningPlanService } from './learning-plan.service';
import { LearningPlanController } from './learning-plan.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [LearningPlanController],
  providers: [LearningPlanService],
})
export class LearningPlanModule {}
```

- [ ] **Step 2: Register in app.module.ts**

Add import after RecommendTestModule:

```typescript
import { LearningPlanModule } from './module/learning-plan/learning-plan.module';
```

Add to imports array:

```typescript
LearningPlanModule,
```

- [ ] **Step 3: Commit**

```bash
git add src/module/learning-plan/
git add src/app.module.ts
git commit -m "feat: add learning plan module"
```

---

## Task 4: Enhance recommend-test with Sub-Skill Analysis

**Files:**
- Modify: `src/module/recommend-test/recommend-test.service.ts`

- [ ] **Step 1: Read current recommend-test.service.ts**

```bash
cat /home/khoa/Documents/ielts_training_app/src/module/recommend-test/recommend-test.service.ts
```

- [ ] **Step 2: Add getWeaknessProfile method**

This reuses the weakness analysis logic from LearningPlanService. Consider extracting to a shared `WeaknessAnalyzerService` to avoid duplication, or keep it in LearningPlanService for now.

The current `getSimpleRecommendations` already handles skill-level weakness. The sub-skill (criterion-level) analysis is handled by LearningPlanService. No changes needed to recommend-test unless you want it to also return sub-skill recommendations.

For now, this task is **optional** - recommend-test works at skill level, LearningPlanService works at sub-skill level. They serve different purposes.

- [ ] **Step 3: Commit (if changes made)**

```bash
git add src/module/recommend-test/
git commit -m "feat: enhance recommend-test with sub-skill analysis"
```

---

## Task 5: Add Dashboard Endpoint for User Progress

**Files:**
- Modify: `src/module/dashboard/dashboard.service.ts`

- [ ] **Step 1: Read current dashboard.service.ts**

```bash
cat /home/khoa/Documents/ielts_training_app/src/module/dashboard/dashboard.service.ts
```

- [ ] **Step 2: Add getUserDashboard method**

Add to dashboard.service.ts:

```typescript
async getUserDashboard(idUser: string) {
  // Get user's current stats
  const [balance, streak, testResults, writingSubs, speakingSubs] = await Promise.all([
    this.getBalance(idUser), // Would call CreditsService in real impl
    this.getStreak(idUser),
    this.db.userTestResult.findMany({
      where: { idUser, status: 'FINISHED' },
      orderBy: { finishedAt: 'desc' },
      take: 10,
      include: { test: { select: { testType: true, title: true } } },
    }),
    this.db.userWritingSubmission.findMany({
      where: { idUser, aiGradingStatus: 'COMPLETED' },
      orderBy: { gradedAt: 'desc' },
      take: 5,
    }),
    this.db.userSpeakingSubmission.findMany({
      where: { idUser, aiGradingStatus: 'COMPLETED' },
      orderBy: { gradedAt: 'desc' },
      take: 5,
    }),
  ]);

  // Calculate skill averages
  const skillAvgs = { LISTENING: 0, READING: 0, WRITING: 0, SPEAKING: 0 };
  const skillCounts = { LISTENING: 0, READING: 0, WRITING: 0, SPEAKING: 0 };

  for (const result of testResults) {
    const type = result.test.testType;
    if (result.bandScore > 0) {
      skillAvgs[type] += result.bandScore;
      skillCounts[type]++;
    }
  }

  for (const skill of Object.keys(skillAvgs)) {
    if (skillCounts[skill as keyof typeof skillCounts] > 0) {
      skillAvgs[skill as keyof typeof skillAvgs] /= skillCounts[skill as keyof typeof skillCounts];
    }
  }

  // Overall average
  const overallAvg = Object.values(skillAvgs).reduce((a, b) => a + b, 0) / 4;

  return {
    currentLevel: this.mapScoreToLevel(overallAvg),
    overallBandScore: Math.round(overallAvg * 10) / 10,
    skillBandScores: skillAvgs,
    currentStreak: streak?.currentStreak || 0,
    totalTestsCompleted: testResults.length,
    recentWritingFeedback: writingSubs.map(w => ({
      id: w.idWritingSubmission,
      bandScore: w.aiOverallScore,
      gradedAt: w.gradedAt,
    })),
    recentSpeakingFeedback: speakingSubs.map(s => ({
      id: s.idSpeakingSubmission,
      bandScore: s.aiOverallScore,
      gradedAt: s.gradedAt,
    })),
  };
}

private mapScoreToLevel(avgScore: number): string {
  if (avgScore < 4.0) return 'Low';
  if (avgScore < 6.0) return 'Mid';
  if (avgScore < 7.5) return 'High';
  return 'Great';
}

private async getStreak(idUser: string) {
  return this.db.user.findUnique({
    where: { idUser },
    select: { currentStreak: true, longestStreak: true, lastStudiedAt: true },
  });
}
```

- [ ] **Step 3: Add route to dashboard controller**

```bash
cat /home/khoa/Documents/ielts_training_app/src/module/dashboard/dashboard.controller.ts
```

Add:

```typescript
@Get('user/:idUser')
async getUserDashboard(@Param('idUser') idUser: string) {
  return this.dashboardService.getUserDashboard(idUser);
}
```

Also add @Param decorator import.

- [ ] **Step 4: Commit**

```bash
git add src/module/dashboard/
git commit -m "feat: add user dashboard endpoint for progress tracking"
```

---

## Verification Checklist

After implementation, verify:

- [ ] `GET /learning-plan` returns personalized week plan with weakness profile
- [ ] Week plan shows correct daily focus based on weakest skill
- [ ] Writing sessions focus on weakest writing sub-skill (TA/CC/LR/GRA)
- [ ] Speaking sessions focus on weakest speaking sub-skill (FC/LR/GRA/P)
- [ ] `GET /dashboard/user/:idUser` returns current stats, skill averages, streak
- [ ] Days remaining calculated correctly from targetExamDate
- [ ] Plan is interleaved (mixes R/L with W/S) not blocked practice
- [ ] New users with no history get a generic balanced plan

---

## Notes

**What's NOT in scope for this plan:**
- Persistent storage of learning plans (plans are regenerated each call based on latest data)
- Progress tracking against the plan (would need `UserLearningProgress` model)
- Notifications/reminders (outside learning plan scope)
- Integration with calendar apps
- Adaptive adjustment based on completed sessions (future enhancement)

**Data requirements:**
- User needs at least some test history for meaningful weakness analysis
- Writing/Speaking submissions with AI grading provide sub-skill level detail
- New users (no history) get a balanced generic plan

**Effort estimation:**
- Task 1 (LearningPlanService): ~200 lines, complex algorithm = High effort
- Task 2-3 (Controller/Module): Simple scaffolding = Low effort
- Task 4 (recommend-test enhancement): Optional, skip for now
- Task 5 (User Dashboard): ~80 lines, moderate = Medium effort

Total: ~300 lines across 4-5 files, ~4-6 hours for experienced NestJS developer.

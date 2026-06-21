import { BadRequestException } from '@nestjs/common';
import { TestType } from '@prisma/client';

/**
 * Per-skill IELTS test limits.
 * Mirrors `src/components/magicpath/ielts-test-editor/testLimits.js` on the FE
 * so validation stays in sync across layers.
 *
 *   - Listening: 4 sections × 5–10 questions each (40 total)
 *   - Reading:   3 passages × 5–14 questions each (40 total)
 *   - Writing:   2 tasks (T1 ≥150 words, T2 ≥250 words)
 *   - Speaking:  3 parts
 *
 * Question-count rules apply only to L/R. Writing/Speaking use part count
 * and (for Writing) word-count rules.
 */
export const IELTS_SKILL_LIMITS: Record<
  TestType,
  {
    label: string;
    partWord: string;
    totalParts: number;
    partMin: number;
    partMax: number;
    totalQuestions: number;
    writingMinWords?: { 1: number; 2: number };
  }
> = {
  LISTENING: {
    label: 'Listening',
    partWord: 'Section',
    totalParts: 4,
    partMin: 5,
    partMax: 10,
    totalQuestions: 40,
  },
  READING: {
    label: 'Reading',
    partWord: 'Part',
    totalParts: 3,
    partMin: 5,
    partMax: 14,
    totalQuestions: 40,
  },
  WRITING: {
    label: 'Writing',
    partWord: 'Task',
    totalParts: 2,
    partMin: 1,
    partMax: 2,
    totalQuestions: 0,
    writingMinWords: { 1: 150, 2: 250 },
  },
  SPEAKING: {
    label: 'Speaking',
    partWord: 'Part',
    totalParts: 3,
    partMin: 1,
    partMax: 3,
    totalQuestions: 0,
  },
};

export type SkillLimit = (typeof IELTS_SKILL_LIMITS)[TestType];

export const getSkillLimits = (skill: TestType): SkillLimit =>
  IELTS_SKILL_LIMITS[skill] ?? IELTS_SKILL_LIMITS.READING;

/**
 * Validate a candidate per-part question count.
 * `currentCount` = how many questions the part already has on the BE.
 * `candidate`    = the new total the caller is trying to commit.
 * Throws BadRequestException with a human-readable message on violation.
 */
export function assertPartQuestionCount(
  skill: TestType,
  currentCount: number,
  candidate: number,
): void {
  const lim = getSkillLimits(skill);
  if (lim.totalQuestions === 0) return; // writing/speaking not a question-count skill
  if (!Number.isFinite(candidate) || candidate < lim.partMin) {
    throw new BadRequestException(
      `${lim.partWord} must have at least ${lim.partMin} questions.`,
    );
  }
  if (candidate > lim.partMax) {
    throw new BadRequestException(
      `${lim.partWord} cannot exceed ${lim.partMax} questions.`,
    );
  }
}

/**
 * Validate total part count for the skill.
 * Listening: max 4 sections. Reading: max 3 passages. Writing: max 2 tasks.
 * Speaking: max 3 parts.
 */
export function assertTotalPartCount(
  skill: TestType,
  currentPartCount: number,
): void {
  const lim = getSkillLimits(skill);
  if (currentPartCount > lim.totalParts) {
    throw new BadRequestException(
      `${lim.label} has a maximum of ${lim.totalParts} ${lim.partWord.toLowerCase()}s.`,
    );
  }
}

/**
 * Validate total question count across all parts of a test.
 */
export function assertTotalQuestionCount(
  skill: TestType,
  currentTotal: number,
): void {
  const lim = getSkillLimits(skill);
  if (lim.totalQuestions === 0) return;
  if (currentTotal > lim.totalQuestions) {
    throw new BadRequestException(
      `${lim.label} has a maximum of ${lim.totalQuestions} questions in total.`,
    );
  }
}

/**
 * Validate word count for a Writing task.
 */
export function assertWritingTaskWordCount(
  taskIdx: 1 | 2,
  wordCount: number,
): void {
  const min = taskIdx === 1 ? 150 : 250;
  if (!Number.isFinite(wordCount) || wordCount < min) {
    throw new BadRequestException(
      `Task ${taskIdx} must be at least ${min} words (got ${wordCount || 0}).`,
    );
  }
}

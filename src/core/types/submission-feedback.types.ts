// ============================================================================
// Submission Feedback — TypeScript types for JSONB `aiDetailedFeedback` fields
// ============================================================================
//
// These types define the shape of the `aiDetailedFeedback` JSONB column
// on `UserWritingSubmission` and `UserSpeakingSubmission`.
//
// The AI Worker (FastAPI) writes this JSON payload after grading.
// NestJS reads and validates it when returning results to the client.
// ============================================================================

/**
 * Mirrors the Prisma `GradingStatus` enum.
 */
export enum GradingStatus {
    PENDING = 'PENDING',
    GRADING = 'GRADING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
}

// ============================================================================
// Writing Feedback
// ============================================================================

/** Individual IELTS Writing criterion score + comment */
export interface WritingCriterionFeedback {
    /** Band score for this criterion (0.0 – 9.0, in 0.5 increments) */
    score: number;
    /** Detailed AI comment for this criterion */
    comment: string;
}

/**
 * Full AI feedback payload for a Writing submission.
 * Stored in `UserWritingSubmission.aiDetailedFeedback` (JSONB).
 *
 * Criteria follow the official IELTS Writing band descriptors:
 * - TA: Task Achievement (Task 2) / Task Response (Task 1)
 * - CC: Coherence and Cohesion
 * - LR: Lexical Resource
 * - GRA: Grammatical Range and Accuracy
 */
export interface WritingDetailedFeedback {
    /** Task Achievement / Task Response */
    taskAchievement: WritingCriterionFeedback;
    /** Coherence and Cohesion */
    coherenceAndCohesion: WritingCriterionFeedback;
    /** Lexical Resource */
    lexicalResource: WritingCriterionFeedback;
    /** Grammatical Range and Accuracy */
    grammaticalRangeAndAccuracy: WritingCriterionFeedback;
    /** Overall summary / general feedback */
    generalFeedback: string;
    /** Optional: sentence-level corrections and suggestions */
    detailedCorrections?: WritingCorrection[];
}

export interface WritingCorrection {
    /** Original text from the essay */
    original: string;
    /** Suggested correction */
    corrected: string;
    /** Explanation of the error */
    explanation: string;
    /** Which criterion this error relates to */
    criterion: 'TA' | 'CC' | 'LR' | 'GRA';
}

// ============================================================================
// Speaking Feedback
// ============================================================================

/** Individual IELTS Speaking criterion score + comment */
export interface SpeakingCriterionFeedback {
    /** Band score for this criterion (0.0 – 9.0, in 0.5 increments) */
    score: number;
    /** Detailed AI comment for this criterion */
    comment: string;
}

/**
 * Full AI feedback payload for a Speaking submission.
 * Stored in `UserSpeakingSubmission.aiDetailedFeedback` (JSONB).
 *
 * Criteria follow the official IELTS Speaking band descriptors:
 * - FC: Fluency and Coherence
 * - LR: Lexical Resource
 * - GRA: Grammatical Range and Accuracy
 * - P: Pronunciation
 */
export interface SpeakingDetailedFeedback {
    /** Fluency and Coherence */
    fluencyAndCoherence: SpeakingCriterionFeedback;
    /** Lexical Resource */
    lexicalResource: SpeakingCriterionFeedback;
    /** Grammatical Range and Accuracy */
    grammaticalRangeAndAccuracy: SpeakingCriterionFeedback;
    /** Pronunciation */
    pronunciation: SpeakingCriterionFeedback;
    /** Overall summary / general feedback */
    generalFeedback: string;
    /** Optional: specific utterance-level corrections */
    detailedCorrections?: SpeakingCorrection[];
}

export interface SpeakingCorrection {
    /** Timestamp in the audio (seconds) */
    timestamp?: number;
    /** What the student said */
    original: string;
    /** Suggested improvement */
    suggestion: string;
    /** Explanation */
    explanation: string;
    /** Which criterion this relates to */
    criterion: 'FC' | 'LR' | 'GRA' | 'P';
}

// ============================================================================
// Re-export barrel
// ============================================================================

export type DetailedFeedback = WritingDetailedFeedback | SpeakingDetailedFeedback;

// ============================================================================
// Question Metadata — Discriminated Unions for JSONB `metadata` field
// ============================================================================
//
// Each Question row stores a `metadata: JsonB` column whose shape depends
// on `questionType`. These types define that shape so you can validate
// payloads at the NestJS boundary using Zod or class-validator.
//
// Usage with Zod:
//   const parsed = QuestionMetadataSchema.parse(question.metadata);
//
// Usage with class-validator / class-transformer:
//   Use the individual metadata classes + @Type(() => ...) discriminator.
// ============================================================================

/**
 * Mirrors the Prisma `QuestionType` enum.
 * Used as the discriminator key in the union.
 */
export enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  TRUE_FALSE_NOT_GIVEN = 'TRUE_FALSE_NOT_GIVEN',
  YES_NO_NOT_GIVEN = 'YES_NO_NOT_GIVEN',
  MATCHING_HEADING = 'MATCHING_HEADING',
  MATCHING_INFORMATION = 'MATCHING_INFORMATION',
  MATCHING_FEATURES = 'MATCHING_FEATURES',
  MATCHING_SENTENCE_ENDINGS = 'MATCHING_SENTENCE_ENDINGS',
  SENTENCE_COMPLETION = 'SENTENCE_COMPLETION',
  SUMMARY_COMPLETION = 'SUMMARY_COMPLETION',
  NOTE_COMPLETION = 'NOTE_COMPLETION',
  TABLE_COMPLETION = 'TABLE_COMPLETION',
  FLOW_CHART_COMPLETION = 'FLOW_CHART_COMPLETION',
  DIAGRAM_LABELING = 'DIAGRAM_LABELING',
  SHORT_ANSWER = 'SHORT_ANSWER',
}

// ============================================================================
// Shared sub-types
// ============================================================================

export interface Option {
  /** Display label, e.g. "A", "B", "C", "D" */
  label: string;
  /** Option text content */
  text: string;
}

export interface MatchingPair {
  /** Left-side key (e.g. heading number, feature label) */
  key: string;
  /** Right-side value (e.g. paragraph letter, person name) */
  value: string;
}

export interface Coordinate {
  /** X position as percentage (0–100) relative to image width */
  x: number;
  /** Y position as percentage (0–100) relative to image height */
  y: number;
}

export interface WordBankItem {
  /** Unique identifier within the word bank */
  id: string;
  /** The word or phrase */
  text: string;
}

// ============================================================================
// Individual Metadata Interfaces — one per QuestionType
// ============================================================================

// ---------------------------------------------------------------------------
// 1. MULTIPLE_CHOICE
// ---------------------------------------------------------------------------
export interface MultipleChoiceMetadata {
  type: QuestionType.MULTIPLE_CHOICE;
  /** List of options (usually 4) */
  options: Option[];
  /** Index(es) of correct option(s) — single for MCQ-single, array for MCQ-multi */
  correctOptionIndexes: number[];
  /** Whether multiple answers can be selected */
  isMultiSelect: boolean;
}

// ---------------------------------------------------------------------------
// 2. TRUE_FALSE_NOT_GIVEN
// ---------------------------------------------------------------------------
export interface TrueFalseNotGivenMetadata {
  type: QuestionType.TRUE_FALSE_NOT_GIVEN;
  /** The statement to evaluate */
  statement: string;
  /** Correct answer: "TRUE" | "FALSE" | "NOT_GIVEN" */
  correctAnswer: 'TRUE' | 'FALSE' | 'NOT_GIVEN';
}

// ---------------------------------------------------------------------------
// 3. YES_NO_NOT_GIVEN
// ---------------------------------------------------------------------------
export interface YesNoNotGivenMetadata {
  type: QuestionType.YES_NO_NOT_GIVEN;
  /** The opinion/claim to evaluate */
  statement: string;
  /** Correct answer: "YES" | "NO" | "NOT_GIVEN" */
  correctAnswer: 'YES' | 'NO' | 'NOT_GIVEN';
}

// ---------------------------------------------------------------------------
// 4. MATCHING_HEADING
// ---------------------------------------------------------------------------
export interface MatchingHeadingMetadata {
  type: QuestionType.MATCHING_HEADING;
  /** Pool of heading options (more headings than paragraphs) */
  headings: Option[];
  /** The paragraph identifier this question refers to (e.g. "Paragraph A") */
  paragraphRef: string;
  /** Index of the correct heading in the `headings` array */
  correctHeadingIndex: number;
}

// ---------------------------------------------------------------------------
// 5. MATCHING_INFORMATION
// ---------------------------------------------------------------------------
export interface MatchingInformationMetadata {
  type: QuestionType.MATCHING_INFORMATION;
  /** The statement to match */
  statement: string;
  /** Available paragraph labels (e.g. ["A", "B", "C", "D"]) */
  paragraphLabels: string[];
  /** Correct paragraph label */
  correctParagraph: string;
}

// ---------------------------------------------------------------------------
// 6. MATCHING_FEATURES
// ---------------------------------------------------------------------------
export interface MatchingFeaturesMetadata {
  type: QuestionType.MATCHING_FEATURES;
  /** The statement or feature to match */
  statement: string;
  /** List of features/people/categories to match against */
  features: Option[];
  /** Label of the correct feature */
  correctFeatureLabel: string;
}

// ---------------------------------------------------------------------------
// 7. MATCHING_SENTENCE_ENDINGS
// ---------------------------------------------------------------------------
export interface MatchingSentenceEndingsMetadata {
  type: QuestionType.MATCHING_SENTENCE_ENDINGS;
  /** The sentence beginning (stem) */
  sentenceStem: string;
  /** Pool of possible endings */
  endings: Option[];
  /** Label of the correct ending */
  correctEndingLabel: string;
}

// ---------------------------------------------------------------------------
// 8. SENTENCE_COMPLETION
// ---------------------------------------------------------------------------
export interface SentenceCompletionMetadata {
  type: QuestionType.SENTENCE_COMPLETION;
  /** The sentence with a blank, e.g. "The city was founded in ___." */
  sentenceWithBlank: string;
  /** Maximum word count for the answer */
  maxWords: number;
  /** Acceptable correct answers (case-insensitive matching) */
  correctAnswers: string[];
}

// ---------------------------------------------------------------------------
// 9. SUMMARY_COMPLETION
// ---------------------------------------------------------------------------
export interface SummaryCompletionMetadata {
  type: QuestionType.SUMMARY_COMPLETION;
  /** The blank position identifier within the summary text */
  blankLabel: string;
  /** Maximum word count for the answer */
  maxWords: number;
  /** Whether answers come from a word bank or the passage */
  hasWordBank: boolean;
  /** Optional word bank (if `hasWordBank` is true) */
  wordBank?: WordBankItem[];
  /** Acceptable correct answers */
  correctAnswers: string[];
  /** The full paragraph/summary text with [number] placeholders for blanks */
  fullParagraph?: string;
}

// ---------------------------------------------------------------------------
// 10. NOTE_COMPLETION
// ---------------------------------------------------------------------------
export interface NoteCompletionMetadata {
  type: QuestionType.NOTE_COMPLETION;
  /** Context around the blank in the notes */
  noteContext: string;
  /** Maximum word count for the answer */
  maxWords: number;
  /** Acceptable correct answers */
  correctAnswers: string[];
  /** The full note text with [number] placeholders for blanks */
  fullNoteText?: string;
}

// ---------------------------------------------------------------------------
// 11. TABLE_COMPLETION
// ---------------------------------------------------------------------------
export interface TableCompletionMetadata {
  type: QuestionType.TABLE_COMPLETION;
  /** Row index in the table (0-based) */
  rowIndex: number;
  /** Column index in the table (0-based) */
  columnIndex: number;
  /** Maximum word count for the answer */
  maxWords: number;
  /** Acceptable correct answers */
  correctAnswers: string[];
}

// ---------------------------------------------------------------------------
// 12. FLOW_CHART_COMPLETION
// ---------------------------------------------------------------------------
export interface FlowChartCompletionMetadata {
  type: QuestionType.FLOW_CHART_COMPLETION;
  /** Position/step in the flow chart */
  stepLabel: string;
  /** Maximum word count for the answer */
  maxWords: number;
  /** Whether answers come from a word bank or the passage */
  hasWordBank: boolean;
  /** Optional word bank */
  wordBank?: WordBankItem[];
  /** Acceptable correct answers */
  correctAnswers: string[];
  /** The full flow chart text with [number] placeholders for blanks */
  fullFlowText?: string;
}

// ---------------------------------------------------------------------------
// 13. DIAGRAM_LABELING (Map Labeling)
// ---------------------------------------------------------------------------
export interface DiagramLabelingMetadata {
  type: QuestionType.DIAGRAM_LABELING;
  /** URL of the diagram/map image */
  imageUrl: string;
  /** Coordinate of the label point on the image */
  labelCoordinate: Coordinate;
  /** Display label for the point (e.g. "1", "A") */
  pointLabel: string;
  /** Whether answers come from a word bank */
  hasWordBank: boolean;
  /** Optional word bank */
  wordBank?: WordBankItem[];
  /** Acceptable correct answers */
  correctAnswers: string[];
}

// ---------------------------------------------------------------------------
// 14. SHORT_ANSWER
// ---------------------------------------------------------------------------
export interface ShortAnswerMetadata {
  type: QuestionType.SHORT_ANSWER;
  /** Maximum word count for the answer */
  maxWords: number;
  /** Acceptable correct answers (case-insensitive matching) */
  correctAnswers: string[];
}

// ============================================================================
// Discriminated Union — THE main type to validate against
// ============================================================================

/**
 * Discriminated union keyed on `type`.
 *
 * Usage:
 * ```ts
 * function processMetadata(meta: QuestionMetadata) {
 *   switch (meta.type) {
 *     case QuestionType.MULTIPLE_CHOICE:
 *       // meta is narrowed to MultipleChoiceMetadata
 *       console.log(meta.options, meta.correctOptionIndexes);
 *       break;
 *     case QuestionType.DIAGRAM_LABELING:
 *       // meta is narrowed to DiagramLabelingMetadata
 *       console.log(meta.imageUrl, meta.labelCoordinate);
 *       break;
 *     // ...etc
 *   }
 * }
 * ```
 */
export type QuestionMetadata =
  | MultipleChoiceMetadata
  | TrueFalseNotGivenMetadata
  | YesNoNotGivenMetadata
  | MatchingHeadingMetadata
  | MatchingInformationMetadata
  | MatchingFeaturesMetadata
  | MatchingSentenceEndingsMetadata
  | SentenceCompletionMetadata
  | SummaryCompletionMetadata
  | NoteCompletionMetadata
  | TableCompletionMetadata
  | FlowChartCompletionMetadata
  | DiagramLabelingMetadata
  | ShortAnswerMetadata;

// ============================================================================
// UserAnswer payload type — mirrors the answer structure per question type
// ============================================================================

export interface UserAnswerPayloadMCQ {
  type: QuestionType.MULTIPLE_CHOICE;
  selectedIndexes: number[];
}

export interface UserAnswerPayloadTFNG {
  type: QuestionType.TRUE_FALSE_NOT_GIVEN;
  answer: 'TRUE' | 'FALSE' | 'NOT_GIVEN';
}

export interface UserAnswerPayloadYNNG {
  type: QuestionType.YES_NO_NOT_GIVEN;
  answer: 'YES' | 'NO' | 'NOT_GIVEN';
}

export interface UserAnswerPayloadMatching {
  type:
    | QuestionType.MATCHING_HEADING
    | QuestionType.MATCHING_INFORMATION
    | QuestionType.MATCHING_FEATURES
    | QuestionType.MATCHING_SENTENCE_ENDINGS;
  /** The label the student selected */
  selectedLabel: string;
}

export interface UserAnswerPayloadFillIn {
  type:
    | QuestionType.SENTENCE_COMPLETION
    | QuestionType.SUMMARY_COMPLETION
    | QuestionType.NOTE_COMPLETION
    | QuestionType.TABLE_COMPLETION
    | QuestionType.FLOW_CHART_COMPLETION
    | QuestionType.SHORT_ANSWER;
  /** Free-text answer */
  answerText: string;
}

export interface UserAnswerPayloadDiagram {
  type: QuestionType.DIAGRAM_LABELING;
  /** Free-text answer or selected word bank item */
  answerText: string;
}

export type UserAnswerPayload =
  | UserAnswerPayloadMCQ
  | UserAnswerPayloadTFNG
  | UserAnswerPayloadYNNG
  | UserAnswerPayloadMatching
  | UserAnswerPayloadFillIn
  | UserAnswerPayloadDiagram;

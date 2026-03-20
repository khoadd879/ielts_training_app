import { z } from 'zod';
import { QuestionType } from '../types/question-metadata.types';

const OptionSchema = z.object({
  label: z.string().min(1),
  text: z.string().min(1),
});

const WordBankItemSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});

const CoordinateSchema = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
});

const MultipleChoiceMetadataSchema = z.object({
  type: z.literal(QuestionType.MULTIPLE_CHOICE),
  options: z.array(OptionSchema).min(2),
  correctOptionIndexes: z.array(z.number().int().min(0)).min(1),
  isMultiSelect: z.boolean(),
});

const TrueFalseNotGivenMetadataSchema = z.object({
  type: z.literal(QuestionType.TRUE_FALSE_NOT_GIVEN),
  statement: z.string().min(1),
  correctAnswer: z.enum(['TRUE', 'FALSE', 'NOT_GIVEN']),
});

const YesNoNotGivenMetadataSchema = z.object({
  type: z.literal(QuestionType.YES_NO_NOT_GIVEN),
  statement: z.string().min(1),
  correctAnswer: z.enum(['YES', 'NO', 'NOT_GIVEN']),
});

const MatchingHeadingMetadataSchema = z.object({
  type: z.literal(QuestionType.MATCHING_HEADING),
  headings: z.array(OptionSchema).min(1),
  paragraphRef: z.string().min(1),
  correctHeadingIndex: z.number().int().min(0),
});

const MatchingInformationMetadataSchema = z.object({
  type: z.literal(QuestionType.MATCHING_INFORMATION),
  statement: z.string().min(1),
  paragraphLabels: z.array(z.string()).min(1),
  correctParagraph: z.string().min(1),
});

const MatchingFeaturesMetadataSchema = z.object({
  type: z.literal(QuestionType.MATCHING_FEATURES),
  statement: z.string().min(1),
  features: z.array(OptionSchema).min(1),
  correctFeatureLabel: z.string().min(1),
});

const MatchingSentenceEndingsMetadataSchema = z.object({
  type: z.literal(QuestionType.MATCHING_SENTENCE_ENDINGS),
  sentenceStem: z.string().min(1),
  endings: z.array(OptionSchema).min(1),
  correctEndingLabel: z.string().min(1),
});

const SentenceCompletionMetadataSchema = z.object({
  type: z.literal(QuestionType.SENTENCE_COMPLETION),
  sentenceWithBlank: z.string().min(1),
  maxWords: z.number().int().min(1),
  correctAnswers: z.array(z.string()).min(1),
});

const SummaryCompletionMetadataSchema = z.object({
  type: z.literal(QuestionType.SUMMARY_COMPLETION),
  blankLabel: z.string().min(1),
  maxWords: z.number().int().min(1),
  hasWordBank: z.boolean(),
  wordBank: z.array(WordBankItemSchema).optional(),
  correctAnswers: z.array(z.string()).min(1),
  fullParagraph: z.string().optional(),
});

const NoteCompletionMetadataSchema = z.object({
  type: z.literal(QuestionType.NOTE_COMPLETION),
  noteContext: z.string().min(1),
  maxWords: z.number().int().min(1),
  correctAnswers: z.array(z.string()).min(1),
  fullNoteText: z.string().optional(),
});

const TableCompletionMetadataSchema = z.object({
  type: z.literal(QuestionType.TABLE_COMPLETION),
  rowIndex: z.number().int().min(0),
  columnIndex: z.number().int().min(0),
  maxWords: z.number().int().min(1),
  correctAnswers: z.array(z.string()).min(1),
});

const FlowChartCompletionMetadataSchema = z.object({
  type: z.literal(QuestionType.FLOW_CHART_COMPLETION),
  stepLabel: z.string().min(1),
  maxWords: z.number().int().min(1),
  hasWordBank: z.boolean(),
  wordBank: z.array(WordBankItemSchema).optional(),
  correctAnswers: z.array(z.string()).min(1),
  fullFlowText: z.string().optional(),
});

const DiagramLabelingMetadataSchema = z.object({
  type: z.literal(QuestionType.DIAGRAM_LABELING),
  imageUrl: z.string().url(),
  labelCoordinate: CoordinateSchema,
  pointLabel: z.string().min(1),
  hasWordBank: z.boolean(),
  wordBank: z.array(WordBankItemSchema).optional(),
  correctAnswers: z.array(z.string()).min(1),
});

const ShortAnswerMetadataSchema = z.object({
  type: z.literal(QuestionType.SHORT_ANSWER),
  maxWords: z.number().int().min(1),
  correctAnswers: z.array(z.string()).min(1),
});

export const QuestionMetadataSchema = z.discriminatedUnion('type', [
  MultipleChoiceMetadataSchema,
  TrueFalseNotGivenMetadataSchema,
  YesNoNotGivenMetadataSchema,
  MatchingHeadingMetadataSchema,
  MatchingInformationMetadataSchema,
  MatchingFeaturesMetadataSchema,
  MatchingSentenceEndingsMetadataSchema,
  SentenceCompletionMetadataSchema,
  SummaryCompletionMetadataSchema,
  NoteCompletionMetadataSchema,
  TableCompletionMetadataSchema,
  FlowChartCompletionMetadataSchema,
  DiagramLabelingMetadataSchema,
  ShortAnswerMetadataSchema,
]);

export type ValidatedMetadata = z.infer<typeof QuestionMetadataSchema>;

const schemaByType: Record<QuestionType, z.ZodTypeAny> = {
  [QuestionType.MULTIPLE_CHOICE]: MultipleChoiceMetadataSchema,
  [QuestionType.TRUE_FALSE_NOT_GIVEN]: TrueFalseNotGivenMetadataSchema,
  [QuestionType.YES_NO_NOT_GIVEN]: YesNoNotGivenMetadataSchema,
  [QuestionType.MATCHING_HEADING]: MatchingHeadingMetadataSchema,
  [QuestionType.MATCHING_INFORMATION]: MatchingInformationMetadataSchema,
  [QuestionType.MATCHING_FEATURES]: MatchingFeaturesMetadataSchema,
  [QuestionType.MATCHING_SENTENCE_ENDINGS]:
    MatchingSentenceEndingsMetadataSchema,
  [QuestionType.SENTENCE_COMPLETION]: SentenceCompletionMetadataSchema,
  [QuestionType.SUMMARY_COMPLETION]: SummaryCompletionMetadataSchema,
  [QuestionType.NOTE_COMPLETION]: NoteCompletionMetadataSchema,
  [QuestionType.TABLE_COMPLETION]: TableCompletionMetadataSchema,
  [QuestionType.FLOW_CHART_COMPLETION]: FlowChartCompletionMetadataSchema,
  [QuestionType.DIAGRAM_LABELING]: DiagramLabelingMetadataSchema,
  [QuestionType.SHORT_ANSWER]: ShortAnswerMetadataSchema,
};

export class QuestionMetadataValidator {
  static validate(
    questionType: QuestionType,
    metadata: unknown,
  ): ValidatedMetadata {
    const schema = schemaByType[questionType];

    if (!schema) {
      throw new QuestionMetadataValidationError(
        `Unknown question type: ${questionType}`,
        questionType,
        metadata,
      );
    }

    const result = schema.safeParse(metadata);

    if (!result.success) {
      throw new QuestionMetadataValidationError(
        `Invalid metadata for ${questionType}: ${result.error.message}`,
        questionType,
        metadata,
        result.error,
      );
    }

    return result.data as ValidatedMetadata;
  }

  static validateMultiple(
    questions: Array<{ questionType: QuestionType; metadata: unknown }>,
  ): ValidatedMetadata[] {
    return questions.map((q) => this.validate(q.questionType, q.metadata));
  }

  static validateAny(metadata: unknown): ValidatedMetadata {
    const result = QuestionMetadataSchema.safeParse(metadata);

    if (!result.success) {
      throw new QuestionMetadataValidationError(
        `Invalid metadata: ${result.error.message}`,
        'UNKNOWN' as QuestionType,
        metadata,
        result.error,
      );
    }

    return result.data;
  }
}

export class QuestionMetadataValidationError extends Error {
  constructor(
    message: string,
    public readonly questionType: QuestionType,
    public readonly metadata: unknown,
    public readonly originalError?: z.ZodError,
  ) {
    super(message);
    this.name = 'QuestionMetadataValidationError';
  }
}

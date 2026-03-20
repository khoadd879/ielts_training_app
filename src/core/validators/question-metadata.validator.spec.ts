import { QuestionType } from '../types/question-metadata.types';
import {
  QuestionMetadataValidator,
  QuestionMetadataValidationError,
} from './question-metadata.validator';

describe('QuestionMetadataValidator', () => {
  describe('validate', () => {
    describe('SENTENCE_COMPLETION', () => {
      it('should validate correct SENTENCE_COMPLETION metadata', () => {
        const metadata = {
          type: QuestionType.SENTENCE_COMPLETION,
          sentenceWithBlank: 'The city was founded in [1].',
          maxWords: 2,
          correctAnswers: ['London'],
        };

        const result = QuestionMetadataValidator.validate(
          QuestionType.SENTENCE_COMPLETION,
          metadata,
        );

        expect(result.type).toBe(QuestionType.SENTENCE_COMPLETION);
        expect(result.sentenceWithBlank).toBe('The city was founded in [1].');
        expect(result.maxWords).toBe(2);
        expect(result.correctAnswers).toEqual(['London']);
      });

      it('should throw error for missing correctAnswers', () => {
        const metadata = {
          type: QuestionType.SENTENCE_COMPLETION,
          sentenceWithBlank: 'The city was founded in [1].',
          maxWords: 2,
        };

        expect(() =>
          QuestionMetadataValidator.validate(
            QuestionType.SENTENCE_COMPLETION,
            metadata,
          ),
        ).toThrow(QuestionMetadataValidationError);
      });

      it('should throw error for wrong question type', () => {
        const metadata = {
          type: QuestionType.MULTIPLE_CHOICE,
          options: [],
          correctOptionIndexes: [0],
          isMultiSelect: false,
        };

        expect(() =>
          QuestionMetadataValidator.validate(
            QuestionType.SENTENCE_COMPLETION,
            metadata,
          ),
        ).toThrow(QuestionMetadataValidationError);
      });
    });

    describe('MULTIPLE_CHOICE', () => {
      it('should validate correct MULTIPLE_CHOICE metadata', () => {
        const metadata = {
          type: QuestionType.MULTIPLE_CHOICE,
          options: [
            { label: 'A', text: 'Option A' },
            { label: 'B', text: 'Option B' },
          ],
          correctOptionIndexes: [0],
          isMultiSelect: false,
        };

        const result = QuestionMetadataValidator.validate(
          QuestionType.MULTIPLE_CHOICE,
          metadata,
        );

        expect(result.type).toBe(QuestionType.MULTIPLE_CHOICE);
        expect(result.options).toHaveLength(2);
        expect(result.correctOptionIndexes).toEqual([0]);
      });

      it('should throw error for empty options', () => {
        const metadata = {
          type: QuestionType.MULTIPLE_CHOICE,
          options: [],
          correctOptionIndexes: [0],
          isMultiSelect: false,
        };

        expect(() =>
          QuestionMetadataValidator.validate(
            QuestionType.MULTIPLE_CHOICE,
            metadata,
          ),
        ).toThrow(QuestionMetadataValidationError);
      });
    });

    describe('SUMMARY_COMPLETION', () => {
      it('should validate correct SUMMARY_COMPLETION metadata with word bank', () => {
        const metadata = {
          type: QuestionType.SUMMARY_COMPLETION,
          blankLabel: '10',
          maxWords: 2,
          hasWordBank: true,
          wordBank: [
            { id: '1', text: 'chemosynthetic' },
            { id: '2', text: 'photosynthetic' },
          ],
          correctAnswers: ['chemosynthetic'],
        };

        const result = QuestionMetadataValidator.validate(
          QuestionType.SUMMARY_COMPLETION,
          metadata,
        );

        expect(result.type).toBe(QuestionType.SUMMARY_COMPLETION);
        expect(result.blankLabel).toBe('10');
        expect(result.hasWordBank).toBe(true);
        expect(result.wordBank).toHaveLength(2);
      });

      it('should validate SUMMARY_COMPLETION without word bank', () => {
        const metadata = {
          type: QuestionType.SUMMARY_COMPLETION,
          blankLabel: '10',
          maxWords: 2,
          hasWordBank: false,
          correctAnswers: ['chemosynthetic'],
        };

        const result = QuestionMetadataValidator.validate(
          QuestionType.SUMMARY_COMPLETION,
          metadata,
        );

        expect(result.type).toBe(QuestionType.SUMMARY_COMPLETION);
        expect(result.hasWordBank).toBe(false);
        expect(result.wordBank).toBeUndefined();
      });

      it('should throw error for invalid word bank item', () => {
        const metadata = {
          type: QuestionType.SUMMARY_COMPLETION,
          blankLabel: '10',
          maxWords: 2,
          hasWordBank: true,
          wordBank: [{ id: '', text: '' }],
          correctAnswers: ['chemosynthetic'],
        };

        expect(() =>
          QuestionMetadataValidator.validate(
            QuestionType.SUMMARY_COMPLETION,
            metadata,
          ),
        ).toThrow(QuestionMetadataValidationError);
      });
    });

    describe('DIAGRAM_LABELING', () => {
      it('should validate correct DIAGRAM_LABELING metadata', () => {
        const metadata = {
          type: QuestionType.DIAGRAM_LABELING,
          imageUrl: 'https://example.com/diagram.png',
          labelCoordinate: { x: 50, y: 25 },
          pointLabel: 'A',
          hasWordBank: false,
          correctAnswers: ['River'],
        };

        const result = QuestionMetadataValidator.validate(
          QuestionType.DIAGRAM_LABELING,
          metadata,
        );

        expect(result.type).toBe(QuestionType.DIAGRAM_LABELING);
        expect(result.imageUrl).toBe('https://example.com/diagram.png');
        expect(result.labelCoordinate).toEqual({ x: 50, y: 25 });
      });

      it('should throw error for invalid URL', () => {
        const metadata = {
          type: QuestionType.DIAGRAM_LABELING,
          imageUrl: 'not-a-url',
          labelCoordinate: { x: 50, y: 25 },
          pointLabel: 'A',
          hasWordBank: false,
          correctAnswers: ['River'],
        };

        expect(() =>
          QuestionMetadataValidator.validate(
            QuestionType.DIAGRAM_LABELING,
            metadata,
          ),
        ).toThrow(QuestionMetadataValidationError);
      });

      it('should throw error for coordinate out of range', () => {
        const metadata = {
          type: QuestionType.DIAGRAM_LABELING,
          imageUrl: 'https://example.com/diagram.png',
          labelCoordinate: { x: 150, y: 25 },
          pointLabel: 'A',
          hasWordBank: false,
          correctAnswers: ['River'],
        };

        expect(() =>
          QuestionMetadataValidator.validate(
            QuestionType.DIAGRAM_LABELING,
            metadata,
          ),
        ).toThrow(QuestionMetadataValidationError);
      });
    });

    describe('TABLE_COMPLETION', () => {
      it('should validate correct TABLE_COMPLETION metadata', () => {
        const metadata = {
          type: QuestionType.TABLE_COMPLETION,
          rowIndex: 0,
          columnIndex: 1,
          maxWords: 2,
          correctAnswers: ['Answer1', 'Answer2'],
        };

        const result = QuestionMetadataValidator.validate(
          QuestionType.TABLE_COMPLETION,
          metadata,
        );

        expect(result.type).toBe(QuestionType.TABLE_COMPLETION);
        expect(result.rowIndex).toBe(0);
        expect(result.columnIndex).toBe(1);
      });

      it('should throw error for negative rowIndex', () => {
        const metadata = {
          type: QuestionType.TABLE_COMPLETION,
          rowIndex: -1,
          columnIndex: 1,
          maxWords: 2,
          correctAnswers: ['Answer'],
        };

        expect(() =>
          QuestionMetadataValidator.validate(
            QuestionType.TABLE_COMPLETION,
            metadata,
          ),
        ).toThrow(QuestionMetadataValidationError);
      });
    });

    describe('SHORT_ANSWER', () => {
      it('should validate correct SHORT_ANSWER metadata', () => {
        const metadata = {
          type: QuestionType.SHORT_ANSWER,
          maxWords: 3,
          correctAnswers: ['Answer1', 'Answer2'],
        };

        const result = QuestionMetadataValidator.validate(
          QuestionType.SHORT_ANSWER,
          metadata,
        );

        expect(result.type).toBe(QuestionType.SHORT_ANSWER);
        expect(result.maxWords).toBe(3);
      });
    });
  });

  describe('validateMultiple', () => {
    it('should validate multiple questions', () => {
      const questions = [
        {
          questionType: QuestionType.SENTENCE_COMPLETION,
          metadata: {
            type: QuestionType.SENTENCE_COMPLETION,
            sentenceWithBlank: 'Test [1]',
            maxWords: 2,
            correctAnswers: ['Answer'],
          },
        },
        {
          questionType: QuestionType.MULTIPLE_CHOICE,
          metadata: {
            type: QuestionType.MULTIPLE_CHOICE,
            options: [
              { label: 'A', text: 'Option A' },
              { label: 'B', text: 'Option B' },
            ],
            correctOptionIndexes: [0],
            isMultiSelect: false,
          },
        },
      ];

      const results = QuestionMetadataValidator.validateMultiple(questions);

      expect(results).toHaveLength(2);
      expect(results[0].type).toBe(QuestionType.SENTENCE_COMPLETION);
      expect(results[1].type).toBe(QuestionType.MULTIPLE_CHOICE);
    });

    it('should throw error if any question is invalid', () => {
      const questions = [
        {
          questionType: QuestionType.SENTENCE_COMPLETION,
          metadata: {
            type: QuestionType.SENTENCE_COMPLETION,
            sentenceWithBlank: 'Test [1]',
            maxWords: 2,
            correctAnswers: ['Answer'],
          },
        },
        {
          questionType: QuestionType.MULTIPLE_CHOICE,
          metadata: {
            type: QuestionType.MULTIPLE_CHOICE,
            options: [],
            correctOptionIndexes: [0],
            isMultiSelect: false,
          },
        },
      ];

      expect(() =>
        QuestionMetadataValidator.validateMultiple(questions),
      ).toThrow(QuestionMetadataValidationError);
    });
  });

  describe('QuestionMetadataValidationError', () => {
    it('should contain error details', () => {
      const metadata = { type: 'invalid' };

      try {
        QuestionMetadataValidator.validate(
          QuestionType.SENTENCE_COMPLETION,
          metadata,
        );
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(QuestionMetadataValidationError);
        const validationError = error as QuestionMetadataValidationError;
        expect(validationError.message).toContain('Invalid metadata');
        expect(validationError.questionType).toBe(
          QuestionType.SENTENCE_COMPLETION,
        );
        expect(validationError.metadata).toBe(metadata);
      }
    });
  });
});

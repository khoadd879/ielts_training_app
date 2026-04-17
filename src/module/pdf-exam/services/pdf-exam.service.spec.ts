import { ConfigService } from '@nestjs/config';
import { QuestionType } from '@prisma/client';
import { ExtractedRawDataDto } from '../dto/extraction-result.dto';
import { TestType } from '../dto/upload-pdf.dto';
import { PdfExamService } from './pdf-exam.service';

jest.mock('./pdf-parser.service', () => ({
  PdfParserService: class PdfParserService {},
}));

describe('PdfExamService sanitizer', () => {
  let service: PdfExamService;

  beforeEach(() => {
    service = new PdfExamService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { get: jest.fn() } as unknown as ConfigService,
    );
  });

  it('aligns question types with metadata and strips unrelated branches', () => {
    const fallback: ExtractedRawDataDto = {
      title: 'IELTS Reading Practice',
      level: 'Mid',
      parts: [
        {
          namePart: 'Part 1',
          order: 1,
          questionGroups: [
            {
              title: 'Questions 1-2',
              questionType: QuestionType.MULTIPLE_CHOICE,
              questions: [
                {
                  questionNumber: 1,
                  content: 'Where will the tour start?',
                  questionType: QuestionType.MULTIPLE_CHOICE,
                  metadata: {
                    type: QuestionType.MULTIPLE_CHOICE,
                    options: [
                      { label: 'A', text: 'At the station' },
                      { label: 'B', text: 'At the museum' },
                    ],
                    correctOptionIndexes: [],
                    isMultiSelect: false,
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    const candidate = {
      title: 'IELTS Reading Practice Set 1',
      level: 'High',
      writingTasks: [
        {
          title: 'Should be removed',
          taskType: 'TASK1',
        },
      ],
      parts: [
        {
          namePart: 'Section 1',
          helper: 'ignore me',
          questionGroups: [
            {
              title: 'Questions 1-2',
              questionType: 'SHORT_ANSWER',
              instructions: 'Choose the correct letter, A, B or C.',
              extraField: 'ignore me too',
              questions: [
                {
                  questionNumber: 1,
                  content: 'Where will the tour start?',
                  questionType: 'SHORT_ANSWER',
                  metadata: {
                    type: 'MULTIPLE_CHOICE',
                    options: [
                      {
                        label: 'A',
                        text: 'At the station',
                        extra: 'remove',
                      },
                      { label: 'B', text: 'At the museum' },
                      'C At the harbour',
                    ],
                    correctOptionIndexes: [0],
                    isMultiSelect: false,
                    extraField: 'remove',
                  },
                  stray: true,
                },
              ],
            },
          ],
        },
      ],
      debug: true,
    };

    const result = (service as any).normalizeVerifiedData(
      candidate,
      fallback,
      TestType.READING,
    ) as ExtractedRawDataDto;

    expect(result.writingTasks).toBeUndefined();
    expect(result.speakingTasks).toBeUndefined();
    expect(result.parts).toHaveLength(1);
    expect(result.parts?.[0].namePart).toBe('Section 1');

    const group = result.parts?.[0].questionGroups[0];
    expect(group?.questionType).toBe(QuestionType.MULTIPLE_CHOICE);
    expect((group as any)?.extraField).toBeUndefined();

    const question = group?.questions[0];
    expect(question?.questionType).toBe(QuestionType.MULTIPLE_CHOICE);
    expect((question as any)?.stray).toBeUndefined();
    expect(question?.metadata).toEqual({
      type: QuestionType.MULTIPLE_CHOICE,
      options: [
        { label: 'A', text: 'At the station' },
        { label: 'B', text: 'At the museum' },
        { label: 'C', text: 'At the harbour' },
      ],
      correctOptionIndexes: [0],
      isMultiSelect: false,
    });
  });

  it('falls back to parser branches when Groq returns empty reading parts', () => {
    const fallback: ExtractedRawDataDto = {
      title: 'IELTS Reading Practice',
      level: 'Mid',
      parts: [
        {
          namePart: 'Part 1',
          order: 1,
          questionGroups: [
            {
              title: 'Questions 1-2',
              questionType: QuestionType.SHORT_ANSWER,
              questions: [
                {
                  questionNumber: 1,
                  content: 'What is the name of the museum?',
                  questionType: QuestionType.SHORT_ANSWER,
                  metadata: {
                    type: QuestionType.SHORT_ANSWER,
                    maxWords: 2,
                    correctAnswers: [],
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    const result = (service as any).normalizeVerifiedData(
      {
        title: 'AI cleanup title',
        parts: [],
      },
      fallback,
      TestType.READING,
    ) as ExtractedRawDataDto;

    expect(result.title).toBe('AI cleanup title');
    expect(result.parts).toHaveLength(1);
    expect(result.parts?.[0].namePart).toBe('Part 1');
    expect(result.parts?.[0].questionGroups[0]).toMatchObject({
      title: 'Questions 1-2',
      questionType: QuestionType.SHORT_ANSWER,
      questions: [
        {
          questionNumber: 1,
          content: 'What is the name of the museum?',
          questionType: QuestionType.SHORT_ANSWER,
          metadata: {
            type: QuestionType.SHORT_ANSWER,
            maxWords: 2,
            correctAnswers: [],
          },
        },
      ],
    });
  });
});

import { Injectable, Logger } from '@nestjs/common';
import { QuestionType } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { BlankNormalizer } from '../../../core/utils/blank-normalizer';
import {
  ExtractedPartDto,
  ExtractedPassageDto,
  ExtractedQuestionDto,
  ExtractedQuestionGroupDto,
  ExtractedRawDataDto,
  ExtractedSpeakingQuestionDto,
  ExtractedSpeakingTaskDto,
  ExtractedWritingTaskDto,
} from '../dto/extraction-result.dto';
import { TestType } from '../dto/upload-pdf.dto';
import {
  ParsedDocumentProfile,
  ParsedPage,
  TextBlock,
} from './pdf-parser.service';

export interface AnalysisResult {
  data: ExtractedRawDataDto;
  confidence: number;
  warnings: string[];
}

interface SectionChunk {
  name: string;
  order: number;
  lines: string[];
  text: string;
}

interface QuestionChunk {
  header: string;
  lines: string[];
  order: number;
}

interface QuestionRange {
  start: number;
  end: number;
}

interface NumberedQuestionBlock {
  number: number;
  lines: string[];
  text: string;
}

interface ParsedOption {
  label: string;
  text: string;
}

@Injectable()
export class StructureAnalyzerService {
  private readonly logger = new Logger(StructureAnalyzerService.name);
  private readonly blankNormalizer = new BlankNormalizer();

  private readonly QUESTION_PATTERNS = {
    MULTIPLE_CHOICE: [
      /choose|correct answer|select (?:the )?(?:correct|right)/i,
      /^(?:A|B|C|D)[\.\)]\s*/m,
      /^\([a-d]\)\s*/m,
    ],
    TRUE_FALSE_NOT_GIVEN: [
      /TRUE\s*\/\s*FALSE\s*\/\s*NOT\s*GIVEN/i,
      /do the following statements agree/i,
      /True\s*or\s*False/i,
      /T\s*\/\s*F\s*\/\s*NG/i,
    ],
    YES_NO_NOT_GIVEN: [
      /YES\s*\/\s*NO\s*\/\s*NOT\s*GIVEN/i,
      /views?|claims?|opinions?/i,
      /Yes\s*or\s*No/i,
      /Y\s*\/\s*N\s*\/\s*NG/i,
    ],
    MATCHING_HEADING: [
      /match(?:ing)?\s*(?:the )?heading/i,
      /paragraph.*heading/i,
      /list of headings/i,
    ],
    MATCHING_INFORMATION: [
      /match(?:ing)?\s*(?:the )?information/i,
      /which paragraph/i,
    ],
    MATCHING_FEATURES: [
      /match(?:ing)?\s*(?:the )?features/i,
      /match(?:ing)?\s*(?:the )?(?:people|categories|characteristics)/i,
    ],
    MATCHING_SENTENCE_ENDINGS: [
      /match(?:ing)?\s*(?:the )?sentence ending/i,
      /complete\s+each\s+sentence/i,
      /choose\s+the\s+correct\s+ending/i,
      /best\s+ending/i,
      /ending\s*\([A-G]/i,
    ],
    SENTENCE_COMPLETION: [
      /\[(\d+)\]/,
      /____+/,
      /complete(?:s|ing)?\s*(?:the )?sentence/i,
    ],
    SUMMARY_COMPLETION: [
      /complete(?:s|ing)?\s*(?:the )?summary/i,
      /summary.*completion/i,
      /^summary$/im,
    ],
    NOTE_COMPLETION: [
      /complete(?:s|ing)?\s*(?:the )?note/i,
      /fill in the note/i,
      /^notes?$/im,
    ],
    TABLE_COMPLETION: [
      /complete(?:s|ing)?\s*(?:the )?table/i,
      /table.*completion/i,
      /^table$/im,
      /\|\s*[A-Z].*\|/,
    ],
    FLOW_CHART_COMPLETION: [
      /complete(?:s|ing)?\s*(?:the )?flow(?:chart)?/i,
      /flow(?:chart)?.*completion/i,
      /^flow[\s-]*chart$/im,
      /step\s*\d+/i,
    ],
    DIAGRAM_LABELING: [
      /label(?:ing)?\s*(?:the )?(?:diagram|map|plan|figure)/i,
      /diagram.*label/i,
      /label.*point/i,
    ],
    SHORT_ANSWER: [
      /write\s*(?:one|two|three|your)/i,
      /choose\s+no\s+more\s+than/i,
      /no\s+more\s+than\s+(?:\d+|one|two|three|four|five|six)\s+words?/i,
      /from\s+the\s+passage/i,
      /in\s*(?:no more than|no fewer than)/i,
      /\d+\s*words?/i,
    ],
  };

  private readonly ANSWER_PATTERNS = {
    TRUE_FALSE_NOT_GIVEN: /\b(TRUE|FALSE|NOT\s*GIVEN)\b/i,
    YES_NO_NOT_GIVEN: /\b(YES|NO|NOT\s*GIVEN)\b/i,
  };

  async analyze(
    parsedData: {
      rawText: string;
      pages: ParsedPage[];
      blocks: TextBlock[];
      title: string;
      level: 'Low' | 'Mid' | 'High' | 'Great';
      profile?: ParsedDocumentProfile;
    },
    testType: TestType,
  ): Promise<AnalysisResult> {
    const correlationId = uuidv4();
    this.logger.log(
      `[${correlationId}] Starting structure analysis for ${testType}`,
    );

    const warnings: string[] = [];

    try {
      let data: ExtractedRawDataDto;
      let confidence = 0.8;

      switch (testType) {
        case TestType.READING:
        case TestType.LISTENING:
          data = this.analyzeReadingListening(parsedData, testType, warnings);
          break;
        case TestType.WRITING:
          data = this.analyzeWriting(parsedData, warnings);
          break;
        case TestType.SPEAKING:
          data = this.analyzeSpeaking(parsedData, warnings);
          break;
        default:
          throw new Error(`Unsupported test type: ${testType}`);
      }

      if (warnings.length > 0) {
        confidence = Math.max(0.45, confidence - warnings.length * 0.06);
      }

      this.logger.log(
        `[${correlationId}] Analysis complete, confidence: ${confidence}`,
      );

      return { data, confidence, warnings };
    } catch (error) {
      this.logger.error(`[${correlationId}] Analysis failed`, error);
      throw error;
    }
  }

  private analyzeReadingListening(
    parsedData: {
      rawText: string;
      pages: ParsedPage[];
      blocks: TextBlock[];
      title: string;
      level: string;
      profile?: ParsedDocumentProfile;
    },
    testType: TestType,
    warnings: string[],
  ): ExtractedRawDataDto {
    const normalizedText = this.preprocessRawText(
      parsedData.rawText,
      parsedData.profile,
    );
    const sections = this.splitIntoSections(normalizedText, testType);
    const parts: ExtractedPartDto[] = [];

    for (const section of sections) {
      const part = this.buildReadingListeningPart(section, testType, warnings);
      parts.push(part);
    }

    const normalizedParts =
      testType === TestType.READING
        ? this.rebalanceReadingParts(parts, warnings)
        : parts;

    if (normalizedParts.length === 0) {
      warnings.push('Could not detect parts - using default structure');
      normalizedParts.push({
        namePart: testType === TestType.LISTENING ? 'Section 1' : 'Part 1',
        order: 1,
        questionGroups: this.buildFallbackQuestionGroups(
          normalizedText.split('\n'),
          warnings,
        ),
      });
    }

    this.applyReadingListeningQualityGate(
      normalizedParts,
      testType,
      parsedData.profile,
      warnings,
    );

    return {
      title: parsedData.title,
      level: parsedData.level as 'Low' | 'Mid' | 'High' | 'Great',
      parts: normalizedParts,
    };
  }

  private analyzeWriting(
    parsedData: {
      rawText: string;
      pages: ParsedPage[];
      title: string;
      level: string;
    },
    warnings: string[],
  ): ExtractedRawDataDto {
    const { rawText, title, level } = parsedData;
    const writingTasks: ExtractedWritingTaskDto[] = [];

    const task1Match = rawText.match(
      /(?:Task\s*1|Task\s*I)[:\s]*(.{100,2000}?)(?=Task\s*2|Task\s*II|$)/is,
    );
    const task2Match = rawText.match(
      /(?:Task\s*2|Task\s*II)[:\s]*(.{100,3000}?)$/is,
    );

    if (task1Match) {
      const task1Content = task1Match[1].trim();
      writingTasks.push({
        title: this.extractWritingTitle(task1Content, 'TASK1'),
        taskType: 'TASK1',
        instructions: this.extractWritingInstructions(task1Content),
        timeLimit: 20,
      });
    }

    if (task2Match) {
      const task2Content = task2Match[1].trim();
      writingTasks.push({
        title: this.extractWritingTitle(task2Content, 'TASK2'),
        taskType: 'TASK2',
        instructions: this.extractWritingInstructions(task2Content),
        timeLimit: 40,
      });
    }

    if (writingTasks.length === 0) {
      warnings.push('Could not detect writing tasks - manual entry required');
      writingTasks.push({
        title: 'Writing Task',
        taskType: 'TASK1',
        timeLimit: 20,
      });
    }

    return {
      title: title || 'IELTS Writing Practice',
      level: level as 'Low' | 'Mid' | 'High' | 'Great',
      writingTasks,
    };
  }

  private analyzeSpeaking(
    parsedData: {
      rawText: string;
      pages: ParsedPage[];
      title: string;
      level: string;
    },
    warnings: string[],
  ): ExtractedRawDataDto {
    const { rawText, title, level } = parsedData;
    const speakingTasks: ExtractedSpeakingTaskDto[] = [];

    const part1Match = rawText.match(
      /(?:Part\s*1|Part\s*I)[:\s]*(.{50,1500}?)(?=Part\s*2|Part\s*II|$)/is,
    );
    const part2Match = rawText.match(
      /(?:Part\s*2|Part\s*II)[:\s]*(.{50,2000}?)(?=Part\s*3|Part\s*III|$)/is,
    );
    const part3Match = rawText.match(
      /(?:Part\s*3|Part\s*III)[:\s]*(.{50,2000}?)$/is,
    );

    if (part1Match) {
      speakingTasks.push({
        title: 'Part 1: Introduction',
        part: 'PART1',
        questions: this.extractSpeakingQuestions(part1Match[1], 'PART1'),
      });
    }

    if (part2Match) {
      speakingTasks.push({
        title: 'Part 2: Cue Card',
        part: 'PART2',
        questions: this.extractSpeakingQuestions(part2Match[1], 'PART2'),
      });
    }

    if (part3Match) {
      speakingTasks.push({
        title: 'Part 3: Discussion',
        part: 'PART3',
        questions: this.extractSpeakingQuestions(part3Match[1], 'PART3'),
      });
    }

    if (speakingTasks.length === 0) {
      warnings.push('Could not detect speaking parts - manual entry required');
      speakingTasks.push({
        title: 'Speaking Part',
        part: 'PART1',
        questions: [],
      });
    }

    return {
      title: title || 'IELTS Speaking Practice',
      level: level as 'Low' | 'Mid' | 'High' | 'Great',
      speakingTasks,
    };
  }

  private preprocessRawText(
    text: string,
    profile?: ParsedDocumentProfile,
  ): string {
    const repeatedArtifacts = new Set(profile?.repeatedArtifacts || []);

    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\u00a0/g, ' ')
      .split('\n')
      .map((line) => this.cleanAnalysisLine(line.replace(/\t/g, '    ')))
      .filter((line, index, lines) => {
        if (!line) {
          return lines[index - 1] !== '';
        }

        return !this.isNoiseLine(line) && !repeatedArtifacts.has(line);
      })
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private splitIntoSections(text: string, testType: TestType): SectionChunk[] {
    const lines = this.toLines(text);
    const sections: SectionChunk[] = [];
    let currentName = testType === TestType.LISTENING ? 'Section 1' : 'Part 1';
    let currentLines: string[] = [];
    let sawExplicitHeading = false;

    for (const line of lines) {
      const heading = this.matchSectionHeading(line);
      if (heading) {
        sawExplicitHeading = true;
        if (currentLines.length > 0) {
          sections.push({
            name: currentName,
            order: sections.length + 1,
            lines: currentLines,
            text: currentLines.join('\n'),
          });
        }
        currentName = heading;
        currentLines = [];
        continue;
      }

      currentLines.push(line);
    }

    if (currentLines.length > 0 || !sawExplicitHeading) {
      sections.push({
        name: currentName,
        order: sections.length + 1,
        lines: currentLines,
        text: currentLines.join('\n'),
      });
    }

    return sections.filter(
      (section) =>
        section.lines.length > 0 || sections.length === 1 || sawExplicitHeading,
    );
  }

  private buildReadingListeningPart(
    section: SectionChunk,
    testType: TestType,
    warnings: string[],
  ): ExtractedPartDto {
    const questionStartIndex = this.findFirstQuestionIndex(section.lines);
    const passage = this.extractPassageFromSection(section, testType);
    const questionLines =
      questionStartIndex >= 0
        ? section.lines.slice(questionStartIndex)
        : section.lines.slice();

    let questionGroups = this.buildQuestionGroups(questionLines, warnings);
    if (questionGroups.length === 0) {
      warnings.push(
        `Could not detect structured question groups in ${section.name}`,
      );
      questionGroups = this.buildFallbackQuestionGroups(
        questionLines,
        warnings,
      );
    }

    const part: ExtractedPartDto = {
      namePart: section.name,
      order: section.order,
      questionGroups,
    };

    if (passage) {
      part.passage = passage;
    }

    return part;
  }

  private extractPassageFromSection(
    section: SectionChunk,
    testType: TestType,
  ): ExtractedPassageDto | null {
    const questionStartIndex = this.findFirstQuestionIndex(section.lines);
    if (questionStartIndex <= 0) {
      return null;
    }

    const candidateLines = section.lines
      .slice(0, questionStartIndex)
      .filter((line) => !this.isLikelyPreambleLine(line));

    const content = candidateLines.join('\n').trim();
    if (!content) {
      return null;
    }

    if (testType === TestType.LISTENING && content.length < 350) {
      return null;
    }

    if (content.length < 120) {
      return null;
    }

    const lines = this.toLines(content);
    const firstLine = lines[0] ?? 'Passage';
    const title =
      firstLine.length >= 4 &&
      firstLine.length <= 120 &&
      !/^read|questions?\s+\d+/i.test(firstLine)
        ? firstLine
        : 'Passage';

    return {
      title,
      content,
      numberParagraph: content.split(/\n{2,}/).filter(Boolean).length || 1,
    };
  }

  private buildQuestionGroups(
    lines: string[],
    warnings: string[],
  ): ExtractedQuestionGroupDto[] {
    const chunks = this.splitIntoQuestionChunks(lines);
    const groups: ExtractedQuestionGroupDto[] = [];

    for (const chunk of chunks) {
      const group = this.buildQuestionGroup(chunk, warnings);
      if (group && group.questions.length > 0) {
        groups.push(group);
      }
    }

    return groups;
  }

  private splitIntoQuestionChunks(lines: string[]): QuestionChunk[] {
    const chunks: QuestionChunk[] = [];
    let current: QuestionChunk | null = null;

    for (const line of lines) {
      if (this.isQuestionRangeHeader(line)) {
        if (current) {
          chunks.push(current);
        }
        current = {
          header: line,
          lines: [],
          order: chunks.length + 1,
        };
        continue;
      }

      if (!current) {
        current = {
          header: 'Questions',
          lines: [],
          order: chunks.length + 1,
        };
      }

      current.lines.push(line);
    }

    if (current) {
      chunks.push(current);
    }

    return chunks.filter(
      (chunk) => chunk.header.trim() || chunk.lines.some((line) => line.trim()),
    );
  }

  private buildQuestionGroup(
    chunk: QuestionChunk,
    warnings: string[],
  ): ExtractedQuestionGroupDto | null {
    const sanitizedLines = this.sanitizeQuestionChunkLines(chunk.lines);
    const joinedText = [chunk.header, ...sanitizedLines].join('\n');
    const questionType = this.detectQuestionType(joinedText);
    const range = this.extractQuestionRange(chunk.header);
    const { instructions, bodyLines } = this.extractInstructionsAndBody(
      chunk.header,
      sanitizedLines,
      questionType,
    );

    const questions = this.parseQuestionsByType(
      questionType,
      bodyLines,
      instructions,
      range,
      joinedText,
    );

    if (questions.length === 0) {
      warnings.push(`Could not parse questions from group "${chunk.header}"`);
      return null;
    }

    return {
      title: this.buildGroupTitle(chunk.header, questionType),
      instructions: instructions || undefined,
      questionType,
      questions,
      order: chunk.order,
    };
  }

  private parseQuestionsByType(
    questionType: QuestionType,
    bodyLines: string[],
    instructions: string,
    range: QuestionRange | null,
    contextText: string,
  ): ExtractedQuestionDto[] {
    switch (questionType) {
      case QuestionType.MULTIPLE_CHOICE:
        return this.parseMultipleChoiceQuestions(
          bodyLines,
          instructions,
          range,
        );
      case QuestionType.TRUE_FALSE_NOT_GIVEN:
      case QuestionType.YES_NO_NOT_GIVEN:
        return this.parseStatementQuestions(questionType, bodyLines, range);
      case QuestionType.MATCHING_HEADING:
        return this.parseMatchingHeadingQuestions(bodyLines, range);
      case QuestionType.MATCHING_INFORMATION:
        return this.parseMatchingInformationQuestions(
          bodyLines,
          instructions,
          contextText,
          range,
        );
      case QuestionType.MATCHING_FEATURES:
        return this.parseMatchingFeaturesQuestions(
          bodyLines,
          instructions,
          range,
        );
      case QuestionType.MATCHING_SENTENCE_ENDINGS:
        return this.parseMatchingSentenceEndingQuestions(
          bodyLines,
          instructions,
          range,
        );
      case QuestionType.SENTENCE_COMPLETION:
        return this.parseSentenceCompletionQuestions(
          bodyLines,
          instructions,
          range,
        );
      case QuestionType.SUMMARY_COMPLETION:
      case QuestionType.NOTE_COMPLETION:
      case QuestionType.TABLE_COMPLETION:
      case QuestionType.FLOW_CHART_COMPLETION:
        return this.parseSharedCompletionQuestions(
          questionType,
          bodyLines,
          instructions,
          range,
        );
      case QuestionType.SHORT_ANSWER:
        return this.parseShortAnswerQuestions(bodyLines, instructions, range);
      case QuestionType.DIAGRAM_LABELING:
        return this.parseSharedCompletionQuestions(
          QuestionType.DIAGRAM_LABELING,
          bodyLines,
          instructions,
          range,
        );
      default:
        return this.buildFallbackQuestionsFromBlocks(
          this.extractNumberedQuestionBlocks(bodyLines, range),
          questionType,
        );
    }
  }

  private parseMultipleChoiceQuestions(
    lines: string[],
    instructions: string,
    range: QuestionRange | null,
  ): ExtractedQuestionDto[] {
    if (this.shouldTreatAsShortAnswer(instructions, lines)) {
      return this.parseShortAnswerQuestions(lines, instructions, range);
    }

    const blocks = this.extractNumberedQuestionBlocks(lines, range);
    const sharedOptions = this.extractStandaloneLetterOptions(lines);
    const isMultiSelect = /(?:two|three|\d+)\s+(?:answers?|letters?)/i.test(
      instructions,
    );

    const questions = blocks.map((block) => {
      const { stem, options } = this.extractInlineLetterOptions(block.text);
      const normalizedOptions = options.length > 0 ? options : sharedOptions;

      return {
        questionNumber: block.number,
        content: stem || block.text,
        questionType: QuestionType.MULTIPLE_CHOICE,
        metadata: {
          type: QuestionType.MULTIPLE_CHOICE,
          options: normalizedOptions,
          correctOptionIndexes: [],
          isMultiSelect,
        },
      };
    });

    if (
      questions.every((question) => question.metadata?.options?.length === 0)
    ) {
      return this.parseShortAnswerQuestions(lines, instructions, range);
    }

    return questions;
  }

  private parseStatementQuestions(
    questionType: QuestionType,
    lines: string[],
    range: QuestionRange | null,
  ): ExtractedQuestionDto[] {
    const blocks = this.extractNumberedQuestionBlocks(lines, range);

    return blocks.map((block) => ({
      questionNumber: block.number,
      content: block.text,
      questionType,
      metadata: {
        type: questionType,
        statement: block.text,
        correctAnswer: null,
      },
    }));
  }

  private parseMatchingHeadingQuestions(
    lines: string[],
    range: QuestionRange | null,
  ): ExtractedQuestionDto[] {
    const { options: headings, remainingLines } = this.extractOptionPool(
      lines,
      /^\(?((?:ix|iv|v?i{1,3}|x))\)?[\.\):\-]?\s+(.*)$/i,
      (label) => label.toLowerCase(),
    );

    const blocks = this.extractNumberedQuestionBlocks(remainingLines, range);
    if (blocks.length > 0) {
      return blocks.map((block) => {
        const paragraphRef = this.extractParagraphReference(block.text);
        return {
          questionNumber: block.number,
          content: paragraphRef || block.text,
          questionType: QuestionType.MATCHING_HEADING,
          metadata: {
            type: QuestionType.MATCHING_HEADING,
            headings,
            paragraphRef: paragraphRef || block.text,
            correctHeadingIndex: null,
          },
        };
      });
    }

    const paragraphLines = remainingLines.filter((line) =>
      /^(?:paragraph|section)\s+[A-Z]\b/i.test(line),
    );

    const numbers = this.resolveSequenceNumbers(range, paragraphLines.length);
    return paragraphLines.map((line, index) => ({
      questionNumber: numbers[index] ?? index + 1,
      content: line,
      questionType: QuestionType.MATCHING_HEADING,
      metadata: {
        type: QuestionType.MATCHING_HEADING,
        headings,
        paragraphRef: line,
        correctHeadingIndex: null,
      },
    }));
  }

  private parseMatchingInformationQuestions(
    lines: string[],
    instructions: string,
    contextText: string,
    range: QuestionRange | null,
  ): ExtractedQuestionDto[] {
    const paragraphLabels = this.extractParagraphLabels(
      `${instructions}\n${contextText}`,
    );
    const blocks = this.extractNumberedQuestionBlocks(lines, range);

    return blocks.map((block) => ({
      questionNumber: block.number,
      content: block.text,
      questionType: QuestionType.MATCHING_INFORMATION,
      metadata: {
        type: QuestionType.MATCHING_INFORMATION,
        statement: block.text,
        paragraphLabels,
        correctParagraph: null,
      },
    }));
  }

  private parseMatchingFeaturesQuestions(
    lines: string[],
    instructions: string,
    range: QuestionRange | null,
  ): ExtractedQuestionDto[] {
    const { options: features, remainingLines } = this.extractOptionPool(
      lines,
      /^\(?([A-Z])\)?[\.\):\-]?\s+(.*)$/i,
      (label) => label.toUpperCase(),
    );
    const blocks = this.extractNumberedQuestionBlocks(remainingLines, range);

    return blocks.map((block) => ({
      questionNumber: block.number,
      content: block.text,
      questionType: QuestionType.MATCHING_FEATURES,
      metadata: {
        type: QuestionType.MATCHING_FEATURES,
        statement: block.text,
        features,
        correctFeatureLabel: null,
      },
    }));
  }

  private parseMatchingSentenceEndingQuestions(
    lines: string[],
    instructions: string,
    range: QuestionRange | null,
  ): ExtractedQuestionDto[] {
    const { options: endings, remainingLines } = this.extractOptionPool(
      lines,
      /^\(?([A-Z])\)?[\.\):\-]?\s+(.*)$/i,
      (label) => label.toUpperCase(),
    );
    const blocks = this.extractNumberedQuestionBlocks(remainingLines, range);

    if (endings.length === 0 && /best ending|ending \(a-/i.test(instructions)) {
      return [];
    }

    return blocks.map((block) => ({
      questionNumber: block.number,
      content: block.text.replace(/^\.\s*/, ''),
      questionType: QuestionType.MATCHING_SENTENCE_ENDINGS,
      metadata: {
        type: QuestionType.MATCHING_SENTENCE_ENDINGS,
        sentenceStem: block.text.replace(/^\.\s*/, ''),
        endings,
        correctEndingLabel: null,
      },
    }));
  }

  private parseSentenceCompletionQuestions(
    lines: string[],
    instructions: string,
    range: QuestionRange | null,
  ): ExtractedQuestionDto[] {
    const blocks = this.extractNumberedQuestionBlocks(lines, range);
    const maxWords = this.extractMaxWords(instructions);

    if (blocks.length > 0) {
      return blocks.map((block) => {
        const normalized = this.normalizeCompletionText(block.text, {
          start: block.number,
          end: block.number,
        });

        return {
          questionNumber: block.number,
          content: normalized.text,
          questionType: QuestionType.SENTENCE_COMPLETION,
          metadata: {
            type: QuestionType.SENTENCE_COMPLETION,
            sentenceWithBlank: normalized.text,
            maxWords,
            correctAnswers: [],
          },
        };
      });
    }

    return this.parseSharedCompletionQuestions(
      QuestionType.SENTENCE_COMPLETION,
      lines,
      instructions,
      range,
    );
  }

  private parseSharedCompletionQuestions(
    questionType: QuestionType,
    lines: string[],
    instructions: string,
    range: QuestionRange | null,
  ): ExtractedQuestionDto[] {
    const content = lines.join('\n').trim();
    if (!content) {
      return [];
    }

    const normalized = this.normalizeCompletionText(content, range);
    const maxWords = this.extractMaxWords(instructions);

    return normalized.numbers.map((questionNumber) => ({
      questionNumber,
      content: normalized.text,
      questionType,
      metadata: this.buildSharedCompletionMetadata(
        questionType,
        normalized.text,
        questionNumber,
        maxWords,
      ),
    }));
  }

  private parseShortAnswerQuestions(
    lines: string[],
    instructions: string,
    range: QuestionRange | null,
  ): ExtractedQuestionDto[] {
    const blocks = this.extractNumberedQuestionBlocks(lines, range);
    const maxWords = this.extractMaxWords(instructions);

    return blocks.map((block) => ({
      questionNumber: block.number,
      content: block.text,
      questionType: QuestionType.SHORT_ANSWER,
      metadata: {
        type: QuestionType.SHORT_ANSWER,
        maxWords,
        correctAnswers: [],
      },
    }));
  }

  private buildSharedCompletionMetadata(
    questionType: QuestionType,
    text: string,
    questionNumber: number,
    maxWords: number,
  ): Record<string, unknown> {
    switch (questionType) {
      case QuestionType.SUMMARY_COMPLETION:
        return {
          type: QuestionType.SUMMARY_COMPLETION,
          blankLabel: String(questionNumber),
          maxWords,
          hasWordBank: false,
          wordBank: [],
          correctAnswers: [],
          fullParagraph: text,
        };
      case QuestionType.NOTE_COMPLETION:
        return {
          type: QuestionType.NOTE_COMPLETION,
          noteContext: this.extractCompletionContext(text, 'Notes'),
          maxWords,
          correctAnswers: [],
          fullNoteText: text,
        };
      case QuestionType.TABLE_COMPLETION:
        return {
          type: QuestionType.TABLE_COMPLETION,
          rowIndex: 0,
          columnIndex: 0,
          maxWords,
          correctAnswers: [],
        };
      case QuestionType.FLOW_CHART_COMPLETION:
        return {
          type: QuestionType.FLOW_CHART_COMPLETION,
          stepLabel: String(questionNumber),
          maxWords,
          hasWordBank: false,
          wordBank: [],
          correctAnswers: [],
          fullFlowText: text,
        };
      case QuestionType.DIAGRAM_LABELING:
        return {
          type: QuestionType.DIAGRAM_LABELING,
          imageUrl: '',
          labelCoordinate: { x: 0, y: 0 },
          pointLabel: String(questionNumber),
          hasWordBank: false,
          wordBank: [],
          correctAnswers: [],
        };
      case QuestionType.SENTENCE_COMPLETION:
      default:
        return {
          type: QuestionType.SENTENCE_COMPLETION,
          sentenceWithBlank: text,
          maxWords,
          correctAnswers: [],
        };
    }
  }

  private buildFallbackQuestionGroups(
    lines: string[],
    warnings: string[],
  ): ExtractedQuestionGroupDto[] {
    const blocks = this.extractNumberedQuestionBlocks(lines, null);
    if (blocks.length === 0) {
      warnings.push('No numbered questions detected in fallback mode');
      return [];
    }

    return [
      {
        title: 'Questions',
        questionType: QuestionType.SHORT_ANSWER,
        questions: this.buildFallbackQuestionsFromBlocks(
          blocks,
          QuestionType.SHORT_ANSWER,
        ),
        order: 1,
      },
    ];
  }

  private buildFallbackQuestionsFromBlocks(
    blocks: NumberedQuestionBlock[],
    questionType: QuestionType,
  ): ExtractedQuestionDto[] {
    return blocks.map((block) => ({
      questionNumber: block.number,
      content: block.text,
      questionType,
      metadata:
        questionType === QuestionType.SHORT_ANSWER
          ? {
              type: QuestionType.SHORT_ANSWER,
              maxWords: 3,
              correctAnswers: [],
            }
          : { type: questionType },
    }));
  }

  private extractInstructionsAndBody(
    header: string,
    lines: string[],
    questionType: QuestionType,
  ): { instructions: string; bodyLines: string[] } {
    const instructions: string[] = [];
    const bodyLines = this.sanitizeQuestionChunkLines(lines);

    const headerInstruction = header
      .replace(/^Questions?\s*\d+(?:\s*(?:-|–|to)\s*\d+)?[:.)]?\s*/i, '')
      .trim();
    if (headerInstruction) {
      instructions.push(headerInstruction);
    }

    while (
      bodyLines.length > 0 &&
      this.isInstructionLine(bodyLines[0], questionType)
    ) {
      instructions.push(bodyLines.shift()!);
    }

    return {
      instructions: instructions.join('\n').trim(),
      bodyLines,
    };
  }

  private isInstructionLine(line: string, questionType: QuestionType): boolean {
    if (!line) {
      return false;
    }

    if (
      this.isNumberedQuestionLine(line) ||
      /^(?:paragraph|section)\s+[A-Z]\b/i.test(line)
    ) {
      return false;
    }

    if (
      questionType === QuestionType.SUMMARY_COMPLETION &&
      /^summary$/i.test(line)
    ) {
      return false;
    }
    if (
      questionType === QuestionType.NOTE_COMPLETION &&
      /^notes?$/i.test(line)
    ) {
      return false;
    }
    if (
      questionType === QuestionType.TABLE_COMPLETION &&
      /^table$/i.test(line)
    ) {
      return false;
    }
    if (
      questionType === QuestionType.FLOW_CHART_COMPLETION &&
      /^flow[\s-]*chart$/i.test(line)
    ) {
      return false;
    }

    return /^(?:choose|select|write|complete|answer|label|match|use|do not|TRUE\/FALSE\/NOT GIVEN|YES\/NO\/NOT GIVEN|questions?\s+\d+|which|look at)/i.test(
      line,
    );
  }

  private detectQuestionType(text: string): QuestionType {
    const orderedTypes: Array<keyof typeof this.QUESTION_PATTERNS> = [
      'MATCHING_HEADING',
      'MATCHING_INFORMATION',
      'MATCHING_FEATURES',
      'MATCHING_SENTENCE_ENDINGS',
      'TRUE_FALSE_NOT_GIVEN',
      'YES_NO_NOT_GIVEN',
      'SUMMARY_COMPLETION',
      'NOTE_COMPLETION',
      'TABLE_COMPLETION',
      'FLOW_CHART_COMPLETION',
      'DIAGRAM_LABELING',
      'SHORT_ANSWER',
      'SENTENCE_COMPLETION',
      'MULTIPLE_CHOICE',
    ];

    for (const type of orderedTypes) {
      const patterns = this.QUESTION_PATTERNS[type];
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          return QuestionType[type as keyof typeof QuestionType];
        }
      }
    }

    if (this.ANSWER_PATTERNS.TRUE_FALSE_NOT_GIVEN.test(text)) {
      return QuestionType.TRUE_FALSE_NOT_GIVEN;
    }
    if (this.ANSWER_PATTERNS.YES_NO_NOT_GIVEN.test(text)) {
      return QuestionType.YES_NO_NOT_GIVEN;
    }

    return QuestionType.MULTIPLE_CHOICE;
  }

  private extractQuestionRange(header: string): QuestionRange | null {
    const match = header.match(/Questions?\s*(\d+)(?:\s*(?:-|–|to)\s*(\d+))?/i);
    if (!match) {
      return null;
    }

    const start = parseInt(match[1], 10);
    const end = match[2] ? parseInt(match[2], 10) : start;
    return { start, end };
  }

  private buildGroupTitle(header: string, questionType: QuestionType): string {
    if (header !== 'Questions') {
      return header;
    }

    return questionType.replace(/_/g, ' ');
  }

  private normalizeCompletionText(
    text: string,
    range: QuestionRange | null,
  ): { text: string; numbers: number[] } {
    const result = this.blankNormalizer.normalizeToNumberedPattern(text);
    if (result.blanks.length === 0) {
      return { text: text.trim(), numbers: [] };
    }

    let numbers = result.blanks.map(
      (blank, index) =>
        blank.originalQuestionNumber ?? blank.questionNumber ?? index + 1,
    );

    if (range) {
      const expected = range.end - range.start + 1;
      if (
        numbers.length === expected &&
        !numbers.every((value, index) => value === range.start + index)
      ) {
        numbers = this.resolveSequenceNumbers(range, numbers.length);
      }
    }

    const normalizedText = this.renumberBlankPlaceholders(
      result.normalizedText,
      numbers,
    );

    return {
      text: normalizedText,
      numbers,
    };
  }

  private renumberBlankPlaceholders(text: string, numbers: number[]): string {
    let index = 0;
    return text.replace(/\[\s*\d+\s*\]/g, () => {
      const number = numbers[index] ?? index + 1;
      index++;
      return `[${number}]`;
    });
  }

  private extractNumberedQuestionBlocks(
    lines: string[],
    range: QuestionRange | null,
  ): NumberedQuestionBlock[] {
    const blocks: NumberedQuestionBlock[] = [];
    let current: NumberedQuestionBlock | null = null;

    for (const line of lines) {
      if (this.isCrossTestBoundaryLine(line)) {
        if (current) {
          blocks.push(this.finalizeQuestionBlock(current));
        }
        break;
      }

      const cleanedLine = this.cleanQuestionLine(line);
      if (!cleanedLine) {
        continue;
      }

      if (this.isCrossTestBoundaryLine(cleanedLine)) {
        if (current) {
          blocks.push(this.finalizeQuestionBlock(current));
        }
        break;
      }

      const match = cleanedLine.match(/^(\d+)(?:[\.\)]|\s)\s*(.+)$/);
      if (match) {
        if (this.isCrossTestBoundaryLine(match[2])) {
          if (current) {
            blocks.push(this.finalizeQuestionBlock(current));
          }
          break;
        }

        if (current) {
          blocks.push(this.finalizeQuestionBlock(current));
        }

        current = {
          number: parseInt(match[1], 10),
          lines: [match[2].trim()],
          text: match[2].trim(),
        };
        continue;
      }

      if (!current) {
        continue;
      }

      if (
        this.isQuestionRangeHeader(cleanedLine) ||
        this.isSectionBoundaryLine(cleanedLine)
      ) {
        blocks.push(this.finalizeQuestionBlock(current));
        current = null;
        break;
      }

      current.lines.push(cleanedLine);
    }

    if (current) {
      blocks.push(this.finalizeQuestionBlock(current));
    }

    if (blocks.length === 0 && range) {
      const paragraphLines = lines.filter((line) => line.trim());
      const numbers = this.resolveSequenceNumbers(range, paragraphLines.length);

      return paragraphLines
        .map((line, index) => ({
          number: numbers[index] ?? 0,
          lines: [line],
          text: line,
        }))
        .filter((block) => block.number > 0);
    }

    return blocks;
  }

  private finalizeQuestionBlock(
    block: NumberedQuestionBlock,
  ): NumberedQuestionBlock {
    return {
      ...block,
      text: block.lines.join('\n').trim(),
    };
  }

  private extractInlineLetterOptions(text: string): {
    stem: string;
    options: ParsedOption[];
  } {
    const lines = this.toLines(text);
    const stemParts: string[] = [];
    const options: ParsedOption[] = [];
    let currentOption: ParsedOption | null = null;

    for (const line of lines) {
      const cleanedLine = this.cleanQuestionLine(line);
      if (!cleanedLine || this.isCrossTestBoundaryLine(cleanedLine)) {
        break;
      }

      const match = cleanedLine.match(/^\(?([A-H])\)?[\.\):\-]?\s+(.*)$/i);
      if (match) {
        if (currentOption) {
          options.push({
            label: currentOption.label,
            text: this.sanitizeOptionText(currentOption.text),
          });
        }

        currentOption = {
          label: match[1].toUpperCase(),
          text: match[2].trim(),
        };
        continue;
      }

      if (currentOption) {
        currentOption.text = `${currentOption.text} ${cleanedLine}`.trim();
      } else {
        stemParts.push(cleanedLine);
      }
    }

    if (currentOption) {
      options.push({
        label: currentOption.label,
        text: this.sanitizeOptionText(currentOption.text),
      });
    }

    return {
      stem: this.compactText(stemParts.join(' ')),
      options,
    };
  }

  private extractStandaloneLetterOptions(lines: string[]): ParsedOption[] {
    const seen = new Set<string>();
    const options: ParsedOption[] = [];

    for (const line of lines) {
      const cleanedLine = this.cleanQuestionLine(line);
      if (!cleanedLine || this.isCrossTestBoundaryLine(cleanedLine)) {
        break;
      }

      const match = cleanedLine.match(/^\(?([A-H])\)?[\.\):\-]?\s+(.*)$/i);
      if (!match) {
        continue;
      }

      const label = match[1].toUpperCase();
      if (seen.has(label)) {
        continue;
      }

      seen.add(label);
      options.push({
        label,
        text: this.sanitizeOptionText(match[2].trim()),
      });
    }

    return options;
  }

  private extractOptionPool(
    lines: string[],
    optionPattern: RegExp,
    labelFormatter: (label: string) => string,
  ): { options: ParsedOption[]; remainingLines: string[] } {
    const options: ParsedOption[] = [];
    const remainingLines: string[] = [];
    let currentOption: ParsedOption | null = null;

    for (const line of lines) {
      const cleanedLine = this.cleanQuestionLine(line);
      if (!cleanedLine || this.isCrossTestBoundaryLine(cleanedLine)) {
        if (currentOption) {
          options.push({
            label: currentOption.label,
            text: this.sanitizeOptionText(currentOption.text),
          });
        }
        break;
      }

      const match = cleanedLine.match(optionPattern);
      if (match) {
        if (currentOption) {
          options.push({
            label: currentOption.label,
            text: this.sanitizeOptionText(currentOption.text),
          });
        }

        currentOption = {
          label: labelFormatter(match[1]),
          text: match[2].trim(),
        };
        continue;
      }

      if (
        currentOption &&
        !this.isNumberedQuestionLine(cleanedLine) &&
        !this.isQuestionRangeHeader(cleanedLine)
      ) {
        currentOption.text = `${currentOption.text} ${cleanedLine}`.trim();
        continue;
      }

      if (currentOption) {
        options.push({
          label: currentOption.label,
          text: this.compactText(currentOption.text),
        });
        currentOption = null;
      }

      remainingLines.push(cleanedLine);
    }

    if (currentOption) {
      options.push({
        label: currentOption.label,
        text: this.sanitizeOptionText(currentOption.text),
      });
    }

    return {
      options,
      remainingLines,
    };
  }

  private extractParagraphLabels(text: string): string[] {
    const rangeMatch = text.match(
      /paragraphs?\s+([A-Z])\s*(?:-|–|to)\s*([A-Z])/i,
    );
    if (rangeMatch) {
      return this.buildLetterRange(rangeMatch[1], rangeMatch[2]);
    }

    const refs = [...text.matchAll(/\bParagraph\s+([A-Z])\b/gi)].map((match) =>
      match[1].toUpperCase(),
    );
    if (refs.length > 0) {
      return [...new Set(refs)];
    }

    return ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  }

  private extractParagraphReference(text: string): string | null {
    const match = text.match(/\b(?:Paragraph|Section)\s+([A-Z])\b/i);
    if (!match) {
      return null;
    }

    return `Paragraph ${match[1].toUpperCase()}`;
  }

  private extractCompletionContext(text: string, fallback: string): string {
    const firstLine = this.toLines(text)[0];
    if (!firstLine) {
      return fallback;
    }

    return firstLine.length <= 120 ? firstLine : fallback;
  }

  private extractMaxWords(instructions: string): number {
    const lower = instructions.toLowerCase();
    const explicitMatch = lower.match(/no more than (\d+) words?/);
    if (explicitMatch) {
      return parseInt(explicitMatch[1], 10);
    }

    const wordMap: Record<string, number> = {
      one: 1,
      two: 2,
      three: 3,
      four: 4,
      five: 5,
      six: 6,
    };

    const wordMatch = lower.match(
      /no more than (one|two|three|four|five|six) words?/,
    );
    if (wordMatch) {
      return wordMap[wordMatch[1]];
    }

    return 3;
  }

  private resolveSequenceNumbers(
    range: QuestionRange | null,
    count: number,
  ): number[] {
    if (!range) {
      return Array.from({ length: count }, (_, index) => index + 1);
    }

    return Array.from({ length: count }, (_, index) => range.start + index);
  }

  private findFirstQuestionIndex(lines: string[]): number {
    return lines.findIndex(
      (line) =>
        this.isQuestionRangeHeader(line) || this.isNumberedQuestionLine(line),
    );
  }

  private matchSectionHeading(line: string): string | null {
    const match = line.match(
      /^(?:(Reading|Listening)\s+)?(Part|Section)\s*(\d+|[IVX]+)\b/i,
    );
    if (!match) {
      return null;
    }

    return `${this.capitalizeWord(match[2])} ${match[3].toUpperCase()}`;
  }

  private isQuestionRangeHeader(line: string): boolean {
    return /^Questions?\s*\d+/i.test(line);
  }

  private isNumberedQuestionLine(line: string): boolean {
    return /^\d+(?:[\.\)]|\s)\s*\S/.test(line);
  }

  private isLikelyPreambleLine(line: string): boolean {
    return (
      /^(?:read the passage|you will hear|listen and answer|answer the questions)/i.test(
        line,
      ) ||
      /^(?:IELTS\s+(?:READING|LISTENING|WRITING|SPEAKING)|Page\s+\d+)\b/i.test(
        line,
      ) ||
      /^https?:\/\//i.test(line)
    );
  }

  private rebalanceReadingParts(
    parts: ExtractedPartDto[],
    warnings: string[],
  ): ExtractedPartDto[] {
    if (parts.length !== 1) {
      return parts;
    }

    const sourcePart = parts[0];
    const groupedByPart = new Map<number, ExtractedQuestionGroupDto[]>();

    for (const group of sourcePart.questionGroups) {
      const firstQuestion = group.questions[0]?.questionNumber;
      if (!firstQuestion) {
        continue;
      }

      const bucket = this.resolveReadingPartBucket(firstQuestion);
      if (!groupedByPart.has(bucket)) {
        groupedByPart.set(bucket, []);
      }
      groupedByPart.get(bucket)!.push(group);
    }

    if (groupedByPart.size <= 1) {
      return parts;
    }

    warnings.push(
      'Rebalanced reading groups into multiple parts based on IELTS question ranges',
    );

    return [...groupedByPart.entries()]
      .sort((left, right) => left[0] - right[0])
      .map(([bucket, questionGroups], index) => ({
        namePart: `Part ${bucket}`,
        order: bucket,
        questionGroups: questionGroups.map((group, groupIndex) => ({
          ...group,
          order: group.order ?? groupIndex + 1,
        })),
        passage: index === 0 ? sourcePart.passage : undefined,
      }));
  }

  private resolveReadingPartBucket(questionNumber: number): number {
    if (questionNumber <= 13) {
      return 1;
    }
    if (questionNumber <= 26) {
      return 2;
    }
    return 3;
  }

  private sanitizeQuestionChunkLines(lines: string[]): string[] {
    const sanitized: string[] = [];

    for (const line of lines) {
      if (this.isCrossTestBoundaryLine(line)) {
        break;
      }

      const cleanedLine = this.cleanQuestionLine(line);
      if (!cleanedLine) {
        continue;
      }

      if (this.isCrossTestBoundaryLine(cleanedLine)) {
        break;
      }

      if (this.isNoiseLine(cleanedLine)) {
        continue;
      }

      sanitized.push(cleanedLine);
    }

    return sanitized;
  }

  private cleanAnalysisLine(line: string): string {
    return this.compactText(this.stripInlineArtifacts(line));
  }

  private cleanQuestionLine(line: string): string {
    const cleaned = this.cleanAnalysisLine(line);
    if (!cleaned) {
      return '';
    }

    return cleaned.replace(/\s*[-–]\s*$/, '').trim();
  }

  private stripInlineArtifacts(line: string): string {
    let cleaned = line.trim();
    if (!cleaned) {
      return '';
    }

    cleaned = cleaned
      .replace(/https?:\/\/\S+\s*Page\s*\d+/gi, '')
      .replace(/https?:\/\/\S+/gi, '')
      .replace(/\bPage\s+\d+\b/gi, '')
      .trim();

    return cleaned;
  }

  private isNoiseLine(line: string): boolean {
    return (
      !line ||
      /^(?:https?:\/\/\S+|Page\s+\d+)$/i.test(line) ||
      /^http$/i.test(line) ||
      /^downloaded from/i.test(line)
    );
  }

  private isCrossTestBoundaryLine(line: string): boolean {
    return /^(?:\d+(?:[\.\)]|\s)\s*)?(?:Task\s*[12]|Writing\s+Task\s*[12]|IELTS\s+WRITING)\b/i.test(
      line.trim(),
    );
  }

  private isSectionBoundaryLine(line: string): boolean {
    return (
      this.matchSectionHeading(line) !== null ||
      this.isCrossTestBoundaryLine(line) ||
      /^IELTS\s+(?:READING|LISTENING|WRITING|SPEAKING)\b/i.test(line)
    );
  }

  private shouldTreatAsShortAnswer(
    instructions: string,
    lines: string[],
  ): boolean {
    if (/best ending|endings?\s+\([A-G]/i.test(instructions)) {
      return false;
    }

    if (
      /(?:no more than|from the passage|choose\s+no\s+more\s+than|answer the questions)/i.test(
        instructions,
      )
    ) {
      return true;
    }

    return !lines.some((line) => /^\(?[A-H]\)?[\.\):\-]?\s+\S/i.test(line));
  }

  private applyReadingListeningQualityGate(
    parts: ExtractedPartDto[],
    testType: TestType,
    profile: ParsedDocumentProfile | undefined,
    warnings: string[],
  ): void {
    const totalQuestions = parts.reduce(
      (total, part) =>
        total +
        part.questionGroups.reduce(
          (groupTotal, group) => groupTotal + group.questions.length,
          0,
        ),
      0,
    );

    if (testType === TestType.READING && totalQuestions < 30) {
      warnings.push(
        `Low reading question coverage detected (${totalQuestions}/40 questions parsed)`,
      );
    }

    if (testType === TestType.LISTENING && totalQuestions < 30) {
      warnings.push(
        `Low listening question coverage detected (${totalQuestions}/40 questions parsed)`,
      );
    }

    if (profile?.likelyMultiColumn) {
      warnings.push(
        'PDF layout appears multi-column; text ordering may still require review',
      );
    }

    for (const part of parts) {
      for (const group of part.questionGroups) {
        const questionNumbers = group.questions.map(
          (question) => question.questionNumber,
        );
        if (new Set(questionNumbers).size !== questionNumbers.length) {
          warnings.push(
            `Duplicate question numbers detected in group "${group.title}"`,
          );
        }

        if (
          group.questionType === QuestionType.MULTIPLE_CHOICE &&
          group.questions.some((question) => {
            const options = (question.metadata as Record<string, unknown>)
              ?.options;
            return !Array.isArray(options) || options.length === 0;
          })
        ) {
          warnings.push(
            `Multiple choice group "${group.title}" has empty option sets and may need review`,
          );
        }
      }
    }
  }

  private buildLetterRange(start: string, end: string): string[] {
    const startCode = start.toUpperCase().charCodeAt(0);
    const endCode = end.toUpperCase().charCodeAt(0);
    const result: string[] = [];

    for (let code = startCode; code <= endCode; code++) {
      result.push(String.fromCharCode(code));
    }

    return result;
  }

  private toLines(text: string): string[] {
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  private compactText(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
  }

  private sanitizeOptionText(text: string): string {
    return this.compactText(text).replace(
      /([.?!])\s+(?:[A-Z][A-Za-z'’-]+(?:\s+[A-Z][A-Za-z'’-]+){1,5})$/,
      '$1',
    );
  }

  private capitalizeWord(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }

  private extractWritingTitle(content: string, taskType: string): string {
    const lines = content.split('\n').filter((line) => line.trim());
    const firstLine = lines[0]?.trim() || '';

    if (firstLine.length > 10 && firstLine.length < 200) {
      return firstLine;
    }

    const chartMatch = content.match(
      /(?:the\s+)?(?:chart|graph|diagram|table)\s+(?:shows?|illustrates?|depicts?)/i,
    );
    if (chartMatch) {
      const sentenceEnd = content.indexOf('.', chartMatch.index || 0);
      if (sentenceEnd > 0) {
        return content.substring(chartMatch.index || 0, sentenceEnd + 1).trim();
      }
    }

    return taskType === 'TASK1' ? 'Task 1: Report' : 'Task 2: Essay';
  }

  private extractWritingInstructions(content: string): string {
    const wordCountMatch = content.match(
      /in\s+(?:at\s+least\s+)?(\d+)\s+words?/i,
    );
    if (wordCountMatch) {
      return `Write at least ${wordCountMatch[1]} words.`;
    }

    const instructMatch = content.match(
      /(?:summarise|summarize|describe|explain|discuss|write).{20,200}/i,
    );
    if (instructMatch) {
      return instructMatch[0].substring(0, 200);
    }

    return '';
  }

  private extractSpeakingQuestions(
    content: string,
    partType: 'PART1' | 'PART2' | 'PART3',
  ): ExtractedSpeakingQuestionDto[] {
    const questions: ExtractedSpeakingQuestionDto[] = [];
    const lines = content.split('\n').filter((line) => line.trim());
    let order = 1;

    for (const line of lines) {
      const trimmed = line.trim();
      if (
        /^(?:what|where|when|who|why|how|do|does|is|are|can|could|would|tell|describe|speak)/i.test(
          trimmed,
        )
      ) {
        if (partType === 'PART1') {
          questions.push({
            prompt: trimmed,
            order: order++,
            preparationTime: 0,
            speakingTime: 60,
          });
        } else if (partType === 'PART2') {
          questions.push({
            topic: trimmed,
            order: order++,
            preparationTime: 60,
            speakingTime: 120,
          });
        } else {
          questions.push({
            prompt: trimmed,
            order: order++,
            preparationTime: 0,
            speakingTime: 90,
          });
        }
      }
    }

    return questions;
  }
}

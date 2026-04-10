import { Injectable, Logger } from '@nestjs/common';
import { QuestionType } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
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
import { PdfParserService, ParsedPage, TextBlock } from './pdf-parser.service';

export interface AnalysisResult {
  data: ExtractedRawDataDto;
  confidence: number;
  warnings: string[];
}

@Injectable()
export class StructureAnalyzerService {
  private readonly logger = new Logger(StructureAnalyzerService.name);

  // Pattern definitions for question type detection
  private readonly QUESTION_PATTERNS = {
    MULTIPLE_CHOICE: [
      /choose|correct answer|select (?:the )?(?:correct|right)/i,
      /^(?:A|B|C|D)[\.\)]\s*/m,
      /^\([a-d]\)\s*/m,
    ],
    TRUE_FALSE_NOT_GIVEN: [
      /TRUE\s*\/\s*FALSE\s*\/\s*NOT\s*GIVEN/i,
      /True\s*or\s*False/i,
      /T\s*\/\s*F\s*\/\s*NG/i,
    ],
    YES_NO_NOT_GIVEN: [
      /YES\s*\/\s*NO\s*\/\s*NOT\s*GIVEN/i,
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
      /complete(?:ing)?\s*(?:the )?sentence/i,
    ],
    SENTENCE_COMPLETION: [
      /\[(\d+)\]/, // [1], [2], etc.
      /____+/, // underscores
      /complete(?:s|ing)?\s*(?:the )?sentence/i,
    ],
    SUMMARY_COMPLETION: [
      /complete(?:s|ing)?\s*(?:the )?summary/i,
      /summary.*completion/i,
    ],
    NOTE_COMPLETION: [
      /complete(?:s|ing)?\s*(?:the )?note/i,
      /fill in the note/i,
    ],
    TABLE_COMPLETION: [
      /complete(?:s|ing)?\s*(?:the )?table/i,
      /table.*completion/i,
      /\|\s*[A-Z].*\|/,
    ],
    FLOW_CHART_COMPLETION: [
      /complete(?:s|ing)?\s*(?:the )?flow(?:chart)?/i,
      /flow(?:chart)?.*completion/i,
      /step\s*\d+/i,
    ],
    DIAGRAM_LABELING: [
      /label(?:ing)?\s*(?:the )?(?:diagram|map|plan|figure)/i,
      /diagram.*label/i,
      /label.*point/i,
    ],
    SHORT_ANSWER: [
      /write\s*(?:one|two|three|your)/i,
      /in\s*(?:no more than|no fewer than)/i,
      /\d+\s*words?/i,
    ],
  };

  // Answer patterns
  private readonly ANSWER_PATTERNS = {
    TRUE_FALSE_NOT_GIVEN: /\b(TRUE|FALSE|NOT\s*GIVEN)\b/i,
    YES_NO_NOT_GIVEN: /\b(YES|NO|NOT\s*GIVEN)\b/i,
  };

  // Part/section patterns
  private readonly PART_PATTERNS = [
    /^(?:Part|Section)\s*(\d+|[IVX]+)/i,
    /^(?:Reading|Listening)\s*(?:Part|Section)?\s*(\d+)/i,
  ];

  // Writing task patterns
  private readonly WRITING_TASK_PATTERNS = {
    TASK1: [
      /Task\s*1/i,
      /graph|chart|diagram|table|process/i,
      /describe\s*(?:the\s+)?(?:information|data|graph|chart)/i,
    ],
    TASK2: [
      /Task\s*2/i,
      /essay|opinion|discuss|argument/i,
      /to what extent|do you agree|what is your opinion/i,
    ],
  };

  // Speaking part patterns
  private readonly SPEAKING_PART_PATTERNS = {
    PART1: [
      /Part\s*1/i,
      /introduction.*question/i,
      /personal\s*(?:topic|question)/i,
    ],
    PART2: [
      /Part\s*2/i,
      /cue\s*card/i,
      /describe\s*(?:a|an|the)/i,
      /talk\s*(?:about|describe)/i,
    ],
    PART3: [
      /Part\s*3/i,
      /follow[\s-]*up/i,
      /discussion/i,
    ],
  };

  constructor(private readonly pdfParserService: PdfParserService) {}

  /**
   * Analyze parsed PDF data and convert to structured exam format
   */
  async analyze(
    parsedData: {
      rawText: string;
      pages: ParsedPage[];
      blocks: TextBlock[];
      title: string;
      level: 'Low' | 'Mid' | 'High' | 'Great';
    },
    testType: TestType,
  ): Promise<AnalysisResult> {
    const correlationId = uuidv4();
    this.logger.log(`[${correlationId}] Starting structure analysis for ${testType}`);

    const warnings: string[] = [];

    try {
      let data: ExtractedRawDataDto;
      let confidence = 0.7;

      switch (testType) {
        case TestType.READING:
        case TestType.LISTENING:
          data = this.analyzeReadingListening(parsedData, warnings);
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

      // Adjust confidence based on warnings
      if (warnings.length > 0) {
        confidence = Math.max(0.4, confidence - warnings.length * 0.1);
      }

      this.logger.log(`[${correlationId}] Analysis complete, confidence: ${confidence}`);

      return { data, confidence, warnings };
    } catch (error) {
      this.logger.error(`[${correlationId}] Analysis failed`, error);
      throw error;
    }
  }

  /**
   * Analyze Reading/Listening exam structure
   */
  private analyzeReadingListening(
    parsedData: { rawText: string; pages: ParsedPage[]; blocks: TextBlock[]; title: string; level: string },
    warnings: string[],
  ): ExtractedRawDataDto {
    const { rawText, pages, title, level } = parsedData;

    // Try to detect passages and questions
    const parts: ExtractedPartDto[] = [];
    const blocks = parsedData.blocks;

    // Group content into parts based on "Part X" markers
    const partGroups = this.groupByParts(rawText, blocks);

    for (const group of partGroups) {
      const part: ExtractedPartDto = {
        namePart: group.name,
        order: group.order,
        questionGroups: [],
      };

      // Check if this part has a passage
      if (group.passageBlocks.length > 0) {
        const passage = this.extractPassage(group.passageBlocks);
        if (passage) {
          part.passage = passage;
        }
      }

      // Extract question groups
      const questionGroups = this.extractQuestionGroups(group.questionBlocks);
      part.questionGroups = questionGroups;

      // Add warnings for unclassified content
      if (group.unclassifiedBlocks.length > 5) {
        warnings.push(
          `${group.unclassifiedBlocks.length} unclassified blocks in ${group.name}`,
        );
      }

      parts.push(part);
    }

    // If no parts detected, create a default part with all content
    if (parts.length === 0) {
      const defaultPart: ExtractedPartDto = {
        namePart: 'Part 1',
        order: 1,
        questionGroups: [],
      };

      const questions = this.extractQuestionsFromText(rawText);
      if (questions.length > 0) {
        defaultPart.questionGroups.push({
          title: 'Questions',
          questionType: QuestionType.MULTIPLE_CHOICE,
          questions,
        });
      }

      parts.push(defaultPart);
      warnings.push('Could not detect parts - using default structure');
    }

    return {
      title,
      level: level as 'Low' | 'Mid' | 'High' | 'Great',
      parts,
    };
  }

  /**
   * Analyze Writing exam structure
   */
  private analyzeWriting(
    parsedData: { rawText: string; pages: ParsedPage[]; title: string; level: string },
    warnings: string[],
  ): ExtractedRawDataDto {
    const { rawText, title, level } = parsedData;
    const writingTasks: ExtractedWritingTaskDto[] = [];

    // Split by task markers
    const task1Match = rawText.match(/(?:Task\s*1|Task\s*I)[:\s]*(.{100,2000}?)(?=Task\s*2|Task\s*II|$)/is);
    const task2Match = rawText.match(/(?:Task\s*2|Task\s*II)[:\s]*(.{100,3000}?)$/is);

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

  /**
   * Analyze Speaking exam structure
   */
  private analyzeSpeaking(
    parsedData: { rawText: string; pages: ParsedPage[]; title: string; level: string },
    warnings: string[],
  ): ExtractedRawDataDto {
    const { rawText, title, level } = parsedData;
    const speakingTasks: ExtractedSpeakingTaskDto[] = [];

    // Split by speaking part markers
    const part1Match = rawText.match(/(?:Part\s*1|Part\s*I)[:\s]*(.{50,1500}?)(?=Part\s*2|Part\s*II|$)/is);
    const part2Match = rawText.match(/(?:Part\s*2|Part\s*II)[:\s]*(.{50,2000}?)(?=Part\s*3|Part\s*III|$)/is);
    const part3Match = rawText.match(/(?:Part\s*3|Part\s*III)[:\s]*(.{50,2000}?)$/is);

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

  // =========================================================================
  // Helper Methods
  // =========================================================================

  /**
   * Group blocks by parts
   */
  private groupByParts(rawText: string, blocks: TextBlock[]): Array<{
    name: string;
    order: number;
    passageBlocks: TextBlock[];
    questionBlocks: TextBlock[];
    unclassifiedBlocks: TextBlock[];
  }> {
    const groups: Array<{
      name: string;
      order: number;
      passageBlocks: TextBlock[];
      questionBlocks: TextBlock[];
      unclassifiedBlocks: TextBlock[];
    }> = [];

    // Split text by part markers
    const partMatches = rawText.split(/(?:^|\n)(?=Part\s+\d+)/im);

    let order = 1;
    for (const section of partMatches) {
      if (!section.trim()) continue;

      // Check if this section is a part
      const partMatch = section.match(/^(Part\s+\d+)/i);
      if (partMatch) {
        groups.push({
          name: partMatch[1],
          order: order++,
          passageBlocks: blocks.filter(
            (b) => b.type === 'paragraph' && section.includes(b.text),
          ),
          questionBlocks: blocks.filter(
            (b) => (b.type === 'question' || b.type === 'option') && section.includes(b.text),
          ),
          unclassifiedBlocks: blocks.filter(
            (b) =>
              b.type === 'list' ||
              (b.type === 'table' && section.includes(b.text)),
          ),
        });
      } else {
        // Check for passage-like content (long paragraphs without question markers)
        const hasQuestions = /Question|Questions|Q\d+/.test(section);
        if (!hasQuestions && section.length > 500) {
          // Likely passage content
          if (groups.length > 0) {
            groups[groups.length - 1].passageBlocks.push(
              ...blocks.filter((b) => section.includes(b.text)),
            );
          }
        }
      }
    }

    return groups;
  }

  /**
   * Extract passage from blocks
   */
  private extractPassage(blocks: TextBlock[]): ExtractedPassageDto | null {
    const paragraphs = blocks
      .filter((b) => b.type === 'paragraph')
      .map((b) => b.text)
      .join('\n\n');

    if (!paragraphs || paragraphs.length < 50) {
      return null;
    }

    // Try to extract title (first line or first bold text)
    const titleMatch = paragraphs.match(/^([^\n]{3,80})/);
    const title = titleMatch ? titleMatch[1].trim() : 'Passage';

    return {
      title,
      content: paragraphs,
      numberParagraph: paragraphs.split(/\n\n/).length,
    };
  }

  /**
   * Extract question groups from question blocks
   */
  private extractQuestionGroups(questionBlocks: TextBlock[]): ExtractedQuestionGroupDto[] {
    const groups: ExtractedQuestionGroupDto[] = [];
    let currentGroup: ExtractedQuestionGroupDto | null = null;
    let questionNumber = 1;

    for (const block of questionBlocks) {
      const text = block.text;

      // Check if this is a question header/group marker
      if (/^Questions?\s*\d+[\-\s]/i.test(text) || /^Q\.?\s*\d+/i.test(text)) {
        if (currentGroup) {
          groups.push(currentGroup);
        }

        const questionType = this.detectQuestionType(text);
        currentGroup = {
          title: text.substring(0, 100),
          questionType,
          questions: [],
        };
      }

      // Check if this is a question (numbered)
      const questionMatch = text.match(/^(\d+)[\.\)]?\s*(.+)/);
      if (questionMatch) {
        if (!currentGroup) {
          currentGroup = {
            title: 'Questions',
            questionType: this.detectQuestionType(text),
            questions: [],
          };
        }

        const questionType = currentGroup.questionType || this.detectQuestionType(text);
        const question = this.parseQuestion(
          parseInt(questionMatch[1], 10),
          questionMatch[2],
          questionType,
        );
        questionNumber = parseInt(questionMatch[1], 10) + 1;

        currentGroup.questions.push(question);
      }
    }

    if (currentGroup && currentGroup.questions.length > 0) {
      groups.push(currentGroup);
    }

    return groups;
  }

  /**
   * Detect question type from text
   */
  private detectQuestionType(text: string): QuestionType {
    const upperText = text.toUpperCase();

    for (const [type, patterns] of Object.entries(this.QUESTION_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(upperText)) {
          return QuestionType[type as keyof typeof QuestionType];
        }
      }
    }

    // Check for answer patterns in text
    if (this.ANSWER_PATTERNS.TRUE_FALSE_NOT_GIVEN.test(text)) {
      return QuestionType.TRUE_FALSE_NOT_GIVEN;
    }
    if (this.ANSWER_PATTERNS.YES_NO_NOT_GIVEN.test(text)) {
      return QuestionType.YES_NO_NOT_GIVEN;
    }

    // Default to MULTIPLE_CHOICE
    return QuestionType.MULTIPLE_CHOICE;
  }

  /**
   * Parse a question and its metadata
   */
  private parseQuestion(
    number: number,
    content: string,
    questionType: QuestionType,
  ): ExtractedQuestionDto {
    const question: ExtractedQuestionDto = {
      questionNumber: number,
      content: content.trim(),
      questionType,
    };

    // Build metadata based on question type
    switch (questionType) {
      case QuestionType.MULTIPLE_CHOICE:
        question.metadata = {
          type: QuestionType.MULTIPLE_CHOICE,
          options: [],
          correctOptionIndexes: [],
          isMultiSelect: false,
        };
        break;

      case QuestionType.TRUE_FALSE_NOT_GIVEN:
        question.metadata = {
          type: QuestionType.TRUE_FALSE_NOT_GIVEN,
          statement: content,
          correctAnswer: null, // Unknown at this point
        };
        break;

      case QuestionType.YES_NO_NOT_GIVEN:
        question.metadata = {
          type: QuestionType.YES_NO_NOT_GIVEN,
          statement: content,
          correctAnswer: null,
        };
        break;

      case QuestionType.SENTENCE_COMPLETION:
      case QuestionType.SUMMARY_COMPLETION:
        question.metadata = {
          type: questionType,
          maxWords: 3,
          correctAnswers: [],
        };
        break;

      default:
        question.metadata = {
          type: questionType,
        };
    }

    return question;
  }

  /**
   * Extract questions from raw text (fallback)
   */
  private extractQuestionsFromText(text: string): ExtractedQuestionDto[] {
    const questions: ExtractedQuestionDto[] = [];
    const lines = text.split('\n');

    let currentQuestion: ExtractedQuestionDto | null = null;
    let questionNumber = 1;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Check for question pattern
      const match = trimmed.match(/^(\d+)[\.\)]?\s*(.+)/);
      if (match) {
        if (currentQuestion) {
          questions.push(currentQuestion);
        }

        currentQuestion = {
          questionNumber: parseInt(match[1], 10) || questionNumber++,
          content: match[2].trim(),
          questionType: this.detectQuestionType(match[2]),
        };

        if (!currentQuestion.questionType) {
          currentQuestion.questionType = QuestionType.MULTIPLE_CHOICE;
        }
      } else if (currentQuestion && currentQuestion.metadata) {
        // Check for answer in this line
        const answerMatch = trimmed.match(this.ANSWER_PATTERNS.TRUE_FALSE_NOT_GIVEN);
        if (answerMatch) {
          (currentQuestion.metadata as Record<string, unknown>).correctAnswer =
            answerMatch[1].toUpperCase().replace(/\s+/g, '_');
        }
      }
    }

    if (currentQuestion) {
      questions.push(currentQuestion);
    }

    return questions;
  }

  /**
   * Extract writing task title
   */
  private extractWritingTitle(content: string, taskType: string): string {
    // Look for the main prompt/instruction
    const lines = content.split('\n').filter((l) => l.trim());
    const firstLine = lines[0]?.trim() || '';

    if (firstLine.length > 10 && firstLine.length < 200) {
      return firstLine;
    }

    // Look for "The chart shows..." type phrases
    const chartMatch = content.match(/(?:the\s+)?(?:chart|graph|diagram|table)\s+(?:shows?|illustrates?|depicts?)/i);
    if (chartMatch) {
      const sentenceEnd = content.indexOf('.', chartMatch.index || 0);
      if (sentenceEnd > 0) {
        return content.substring(chartMatch.index || 0, sentenceEnd + 1).trim();
      }
    }

    return taskType === 'TASK1' ? 'Task 1: Report' : 'Task 2: Essay';
  }

  /**
   * Extract writing instructions
   */
  private extractWritingInstructions(content: string): string {
    // Look for "in at least 150/250 words" pattern
    const wordCountMatch = content.match(/in\s+(?:at\s+least\s+)?(\d+)\s+words?/i);
    if (wordCountMatch) {
      return `Write at least ${wordCountMatch[1]} words.`;
    }

    // Look for common instruction phrases
    const instructMatch = content.match(
      /(?:summarise|summarize|describe|explain|discuss|write).{20,200}/i,
    );
    if (instructMatch) {
      return instructMatch[0].substring(0, 200);
    }

    return '';
  }

  /**
   * Extract speaking questions from text
   */
  private extractSpeakingQuestions(
    content: string,
    partType: 'PART1' | 'PART2' | 'PART3',
  ): ExtractedSpeakingQuestionDto[] {
    const questions: ExtractedSpeakingQuestionDto[] = [];
    const lines = content.split('\n').filter((l) => l.trim());

    let order = 1;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Check for question patterns
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
          // Part 2 is typically a cue card
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

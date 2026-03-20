export interface BlankPosition {
  index: number;
  originalText: string;
  questionNumber?: number;
  originalQuestionNumber?: number;
}

export interface NormalizeResult {
  normalizedText: string;
  blanks: BlankPosition[];
}

export class BlankNormalizer {
  detectBlankPositions(text: string): BlankPosition[] {
    const blanks: BlankPosition[] = [];
    let blankIndex = 0;

    const numberedPatternWithSpaces = /\[\s*(\d+)\s*\]/g;
    for (const match of text.matchAll(numberedPatternWithSpaces)) {
      blanks.push({
        index: blankIndex++,
        originalText: match[0],
        questionNumber: parseInt(match[1], 10),
      });
    }

    if (blanks.length > 0) {
      return blanks;
    }

    const underscoreNumPattern = /____\((\d+)\)____/g;
    let match: RegExpExecArray | null = null;
    while ((match = underscoreNumPattern.exec(text)) !== null) {
      blanks.push({
        index: blankIndex++,
        originalText: match[0],
        questionNumber: parseInt(match[1], 10),
      });
    }

    if (blanks.length > 0) {
      return blanks;
    }

    const underscorePattern = /_{4,}/g;
    while ((match = underscorePattern.exec(text)) !== null) {
      blanks.push({
        index: blankIndex++,
        originalText: match[0],
      });
    }

    if (blanks.length > 0) {
      return blanks;
    }

    const blankKeywordPattern = /\[blank\]/gi;
    while ((match = blankKeywordPattern.exec(text)) !== null) {
      blanks.push({
        index: blankIndex++,
        originalText: match[0],
      });
    }

    return blanks;
  }

  normalizeToNumberedPattern(
    text: string,
    forceSequential = false,
  ): NormalizeResult {
    const blanks: BlankPosition[] = [];
    let normalizedText = text;
    let sequentialNumber = 0;
    let offset = 0;

    const numberedPatternWithSpaces = /\[\s*(\d+)\s*\]/g;
    const numberedMatches = [...text.matchAll(numberedPatternWithSpaces)];

    if (numberedMatches.length > 0) {
      for (const match of numberedMatches) {
        const questionNumber = parseInt(match[1], 10);
        const fullMatch: string = match[0];
        const standardizedMatch = `[${questionNumber}]`;
        const matchStart = match.index + offset;

        normalizedText =
          normalizedText.slice(0, matchStart) +
          standardizedMatch +
          normalizedText.slice(matchStart + fullMatch.length);

        offset += standardizedMatch.length - fullMatch.length;

        blanks.push({
          index: blanks.length,
          originalText: fullMatch,
          questionNumber: questionNumber,
          originalQuestionNumber: questionNumber,
        });
      }
      return { normalizedText, blanks };
    }

    const positions: {
      start: number;
      end: number;
      questionNumber?: number;
      original: string;
    }[] = [];

    const underscoreNumPattern = /____\((\d+)\)____/g;
    for (const match of text.matchAll(underscoreNumPattern)) {
      positions.push({
        start: match.index,
        end: match.index + match[0].length,
        questionNumber: parseInt(match[1], 10),
        original: match[0],
      });
    }

    const underscorePattern = /_{4,}/g;
    for (const match of text.matchAll(underscorePattern)) {
      const startIdx: number = match.index;
      const original: string = match[0];
      const isOverlap = positions.some(
        (p) => startIdx >= p.start && startIdx < p.end,
      );
      if (!isOverlap) {
        positions.push({
          start: startIdx,
          end: startIdx + original.length,
          original: original,
        });
      }
    }

    const blankKeywordPattern = /\[blank\]/gi;
    for (const match of text.matchAll(blankKeywordPattern)) {
      const startIdx: number = match.index;
      const original: string = match[0];
      const isOverlap = positions.some(
        (p) => startIdx >= p.start && startIdx < p.end,
      );
      if (!isOverlap) {
        positions.push({
          start: startIdx,
          end: startIdx + original.length,
          original: original,
        });
      }
    }

    positions.sort((a, b) => a.start - b.start);

    const useOriginalNumbers =
      !forceSequential &&
      positions.length === 1 &&
      positions[0].questionNumber !== undefined;

    let result = '';
    let lastEnd = 0;
    for (const pos of positions) {
      result += text.slice(lastEnd, pos.start);

      if (useOriginalNumbers && pos.questionNumber !== undefined) {
        result += `[${pos.questionNumber}]`;
        blanks.push({
          index: blanks.length,
          originalText: pos.original,
          questionNumber: pos.questionNumber,
          originalQuestionNumber: pos.questionNumber,
        });
      } else {
        sequentialNumber++;
        if (pos.questionNumber !== undefined) {
          result += `[${sequentialNumber}]`;
          blanks.push({
            index: blanks.length,
            originalText: pos.original,
            questionNumber: sequentialNumber,
            originalQuestionNumber: pos.questionNumber,
          });
        } else {
          result += `[${sequentialNumber}]`;
          blanks.push({
            index: blanks.length,
            originalText: pos.original,
            questionNumber: sequentialNumber,
          });
        }
      }
      lastEnd = pos.end;
    }
    result += text.slice(lastEnd);

    return { normalizedText: result, blanks };
  }

  extractBlanksFromText(text: string): NormalizeResult {
    return this.normalizeToNumberedPattern(text, true);
  }

  getQuestionTextWithBlank(text: string): string {
    const result = this.normalizeToNumberedPattern(text, true);
    return result.normalizedText;
  }

  parseNumberedBlanks(text: string): BlankPosition[] {
    const blanks: BlankPosition[] = [];
    let index = 0;

    const numberedPatternWithSpaces = /\[\s*(\d+)\s*\]/g;
    for (const match of text.matchAll(numberedPatternWithSpaces)) {
      blanks.push({
        index: index++,
        originalText: match[0],
        questionNumber: parseInt(match[1], 10),
      });
    }

    return blanks;
  }

  isStandardizedBlankPattern(text: string): boolean {
    const pattern = /\[\s*\d+\s*\]/;
    return pattern.test(text);
  }
}

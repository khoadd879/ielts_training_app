import { BlankNormalizer } from './blank-normalizer';

describe('BlankNormalizer', () => {
  let normalizer: BlankNormalizer;

  beforeEach(() => {
    normalizer = new BlankNormalizer();
  });

  describe('detectBlankPositions', () => {
    it('should detect [number] pattern', () => {
      const text = 'The city was founded in [1].';
      const blanks = normalizer.detectBlankPositions(text);
      expect(blanks).toHaveLength(1);
      expect(blanks[0]).toEqual({
        index: 0,
        originalText: '[1]',
        questionNumber: 1,
      });
    });

    it('should detect multiple [number] patterns', () => {
      const text =
        'Hydrothermal vents rely on [1] bacteria which convert [2] into energy.';
      const blanks = normalizer.detectBlankPositions(text);
      expect(blanks).toHaveLength(2);
      expect(blanks[0].questionNumber).toBe(1);
      expect(blanks[1].questionNumber).toBe(2);
    });

    it('should detect [ number ] with spaces', () => {
      const text = 'The answer is [ 5 ].';
      const blanks = normalizer.detectBlankPositions(text);
      expect(blanks).toHaveLength(1);
      expect(blanks[0].questionNumber).toBe(5);
    });

    it('should detect ____ pattern (4 underscores)', () => {
      const text = 'The city was founded in ____.';
      const blanks = normalizer.detectBlankPositions(text);
      expect(blanks).toHaveLength(1);
      expect(blanks[0].originalText).toBe('____');
    });

    it('should detect _____ pattern (5 underscores)', () => {
      const text = 'The answer is _____.';
      const blanks = normalizer.detectBlankPositions(text);
      expect(blanks).toHaveLength(1);
      expect(blanks[0].originalText).toBe('_____');
    });

    it('should detect six or more underscores as blank', () => {
      const text = 'Multiple blanks: ____ and ______.';
      const blanks = normalizer.detectBlankPositions(text);
      expect(blanks).toHaveLength(2);
    });

    it('should detect ____(n)____ pattern', () => {
      const text = '____(10)____ bacteria';
      const blanks = normalizer.detectBlankPositions(text);
      expect(blanks).toHaveLength(1);
      expect(blanks[0].questionNumber).toBe(10);
    });

    it('should detect [blank] pattern', () => {
      const text = 'The answer is [blank].';
      const blanks = normalizer.detectBlankPositions(text);
      expect(blanks).toHaveLength(1);
      expect(blanks[0].originalText).toBe('[blank]');
    });

    it('should detect multiple different patterns in same text', () => {
      const text =
        'Hydrothermal vents support ecosystems that rely on ____(10)____ bacteria which convert chemicals — particularly ____(11)____ — into energy.';
      const blanks = normalizer.detectBlankPositions(text);
      expect(blanks).toHaveLength(2);
      expect(blanks[0].questionNumber).toBe(10);
      expect(blanks[1].questionNumber).toBe(11);
    });

    it('should return empty array for text without blanks', () => {
      const text = 'This is a normal sentence without any blanks.';
      const blanks = normalizer.detectBlankPositions(text);
      expect(blanks).toHaveLength(0);
    });
  });

  describe('normalizeToNumberedPattern', () => {
    it('should convert [number] to itself', () => {
      const text = 'The city was founded in [1].';
      const result = normalizer.normalizeToNumberedPattern(text);
      expect(result.normalizedText).toBe('The city was founded in [1].');
      expect(result.blanks).toHaveLength(1);
      expect(result.blanks[0].questionNumber).toBe(1);
    });

    it('should convert ____(n)____ to [number] preserving original number', () => {
      const text = '____(10)____ bacteria';
      const result = normalizer.normalizeToNumberedPattern(text);
      expect(result.normalizedText).toBe('[10] bacteria');
      expect(result.blanks[0].questionNumber).toBe(10);
    });

    it('should convert multiple patterns and assign sequential numbers', () => {
      const text =
        '____(10)____ bacteria which convert ____(11)____ into energy.';
      const result = normalizer.normalizeToNumberedPattern(text);
      expect(result.normalizedText).toBe(
        '[1] bacteria which convert [2] into energy.',
      );
      expect(result.blanks).toHaveLength(2);
      expect(result.blanks[0].originalQuestionNumber).toBe(10);
      expect(result.blanks[0].questionNumber).toBe(1);
      expect(result.blanks[1].originalQuestionNumber).toBe(11);
      expect(result.blanks[1].questionNumber).toBe(2);
    });

    it('should convert plain underscores to [number] with sequential numbering', () => {
      const text = 'The city was founded in ____ and became ____.';
      const result = normalizer.normalizeToNumberedPattern(text);
      expect(result.normalizedText).toBe(
        'The city was founded in [1] and became [2].',
      );
      expect(result.blanks).toHaveLength(2);
    });

    it('should convert [blank] to [number]', () => {
      const text = 'The answer is [blank].';
      const result = normalizer.normalizeToNumberedPattern(text);
      expect(result.normalizedText).toBe('The answer is [1].');
      expect(result.blanks).toHaveLength(1);
    });

    it('should handle mixed patterns and normalize all', () => {
      const text = '____(5)____ bacteria convert [blank] into energy.';
      const result = normalizer.normalizeToNumberedPattern(text);
      expect(result.normalizedText).toBe(
        '[1] bacteria convert [2] into energy.',
      );
      expect(result.blanks).toHaveLength(2);
    });
  });

  describe('extractBlanksFromText', () => {
    it('should extract blank positions from full paragraph', () => {
      const text =
        'Hydrothermal vents support ecosystems that rely on ____(10)____ bacteria which convert chemicals — particularly ____(11)____ — into energy.';
      const result = normalizer.extractBlanksFromText(text);

      expect(result.normalizedText).toBe(
        'Hydrothermal vents support ecosystems that rely on [1] bacteria which convert chemicals — particularly [2] — into energy.',
      );
      expect(result.blanks).toHaveLength(2);
      expect(result.blanks[0].questionNumber).toBe(1);
      expect(result.blanks[0].originalText).toBe('____(10)____');
      expect(result.blanks[1].questionNumber).toBe(2);
      expect(result.blanks[1].originalText).toBe('____(11)____');
    });

    it('should handle table HTML content with numbered blanks', () => {
      const html =
        '<table><tr><td>Item [1] description</td><td>Item [2] details</td></tr></table>';
      const result = normalizer.extractBlanksFromText(html);

      expect(result.blanks).toHaveLength(2);
      expect(result.blanks[0].questionNumber).toBe(1);
      expect(result.blanks[1].questionNumber).toBe(2);
    });

    it('should preserve HTML structure while normalizing blanks', () => {
      const html = '<p>Answer is ____(1)____.</p>';
      const result = normalizer.extractBlanksFromText(html);

      expect(result.normalizedText).toBe('<p>Answer is [1].</p>');
      expect(result.blanks).toHaveLength(1);
    });
  });

  describe('getQuestionTextWithBlank', () => {
    it('should return text with numbered blank placeholder', () => {
      const text = 'The city was founded in [1].';
      const result = normalizer.getQuestionTextWithBlank(text);
      expect(result).toBe('The city was founded in [1].');
    });

    it('should normalize and return text with numbered blanks', () => {
      const text = '____(5)____ bacteria';
      const result = normalizer.getQuestionTextWithBlank(text);
      expect(result).toBe('[1] bacteria');
    });
  });

  describe('parseNumberedBlanks', () => {
    it('should parse text and extract numbered blank positions', () => {
      const text = 'The [1] was founded in [2] by [3].';
      const positions = normalizer.parseNumberedBlanks(text);

      expect(positions).toHaveLength(3);
      expect(positions[0]).toEqual({
        index: 0,
        originalText: '[1]',
        questionNumber: 1,
      });
      expect(positions[1]).toEqual({
        index: 1,
        originalText: '[2]',
        questionNumber: 2,
      });
      expect(positions[2]).toEqual({
        index: 2,
        originalText: '[3]',
        questionNumber: 3,
      });
    });

    it('should handle gaps in numbering', () => {
      const text = 'Questions [1] and [5] are important.';
      const positions = normalizer.parseNumberedBlanks(text);

      expect(positions).toHaveLength(2);
      expect(positions[0].questionNumber).toBe(1);
      expect(positions[1].questionNumber).toBe(5);
    });

    it('should return empty array for text without numbered blanks', () => {
      const text = 'No blanks in this text.';
      const positions = normalizer.parseNumberedBlanks(text);
      expect(positions).toHaveLength(0);
    });
  });

  describe('isStandardizedBlankPattern', () => {
    it('should return true for [number] pattern', () => {
      expect(normalizer.isStandardizedBlankPattern('[1]')).toBe(true);
      expect(normalizer.isStandardizedBlankPattern('[10]')).toBe(true);
      expect(normalizer.isStandardizedBlankPattern('[ 5 ]')).toBe(true);
    });

    it('should return false for non-standard patterns', () => {
      expect(normalizer.isStandardizedBlankPattern('____')).toBe(false);
      expect(normalizer.isStandardizedBlankPattern('____(5)____')).toBe(false);
      expect(normalizer.isStandardizedBlankPattern('[blank]')).toBe(false);
      expect(normalizer.isStandardizedBlankPattern('normal text')).toBe(false);
    });
  });
});

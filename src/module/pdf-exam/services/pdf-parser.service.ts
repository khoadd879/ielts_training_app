import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as pdfjsLib from 'pdfjs-dist';
import { v4 as uuidv4 } from 'uuid';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface ParsedPage {
  pageNumber: number;
  text: string;
  blocks: TextBlock[];
}

export interface TextBlock {
  type: 'heading' | 'paragraph' | 'question' | 'option' | 'table' | 'list';
  text: string;
  fontSize?: number;
  fontWeight?: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ExtractedExamData {
  title: string;
  level: 'Low' | 'Mid' | 'High' | 'Great';
  rawText: string;
  pages: ParsedPage[];
  blocks: TextBlock[];
  confidence: number;
  warnings: string[];
}

@Injectable()
export class PdfParserService {
  private readonly logger = new Logger(PdfParserService.name);

  private readonly MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
  private readonly SUPPORTED_MIME_TYPES = ['application/pdf'];

  /**
   * Parse a PDF file buffer and extract text with block structure
   */
  async parsePdf(
    fileBuffer: Buffer,
    testType: string,
  ): Promise<ExtractedExamData> {
    const correlationId = uuidv4();
    this.logger.log(`[${correlationId}] Starting PDF parse, size: ${fileBuffer.length} bytes`);

    // Validate file
    this.validateFile(fileBuffer);

    try {
      // Load PDF document
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(fileBuffer),
        useSystemFonts: true,
      });

      const pdfDocument = await loadingTask.promise;
      this.logger.log(`[${correlationId}] PDF loaded, pages: ${pdfDocument.numPages}`);

      const pages: ParsedPage[] = [];
      const allBlocks: TextBlock[] = [];
      let rawText = '';

      // Extract text from each page
      for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
        const page = await pdfDocument.getPage(pageNum);
        const pageData = await this.extractPageContent(page, pageNum);
        pages.push(pageData);
        rawText += pageData.text + '\n\n';
        allBlocks.push(...pageData.blocks);
      }

      // Detect title from first page
      const title = this.detectTitle(pages[0]?.blocks || [], rawText);

      // Detect level (default to Mid if not detected)
      const level = this.detectLevel(rawText) || 'Mid';

      // Calculate confidence based on text extraction success
      const textDensity = rawText.length / pdfDocument.numPages;
      const confidence = Math.min(0.95, Math.max(0.5, textDensity / 500));

      // Collect warnings
      const warnings: string[] = [];
      if (textDensity < 200) {
        warnings.push('Low text density detected - this may be an image-based PDF');
      }
      if (pdfDocument.numPages < 1) {
        warnings.push('PDF appears to be empty');
      }

      this.logger.log(`[${correlationId}] Parse complete, confidence: ${confidence}`);

      return {
        title,
        level,
        rawText,
        pages,
        blocks: allBlocks,
        confidence,
        warnings,
      };
    } catch (error) {
      this.logger.error(`[${correlationId}] PDF parse failed`, error);
      if (error instanceof Error) {
        if (error.message.includes('password')) {
          throw new BadRequestException('PDF is encrypted with a password');
        }
        if (error.message.includes('Invalid PDF')) {
          throw new BadRequestException('Invalid or corrupted PDF file');
        }
      }
      throw new BadRequestException('Failed to parse PDF file');
    }
  }

  /**
   * Validate file size and basic structure
   */
  private validateFile(buffer: Buffer): void {
    if (buffer.length > this.MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds limit. Maximum allowed: ${this.MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }

    // Check PDF magic bytes
    const header = buffer.slice(0, 5).toString();
    if (header !== '%PDF-') {
      throw new BadRequestException('File is not a valid PDF');
    }
  }

  /**
   * Extract text content from a single page with block detection
   */
  private async extractPageContent(
    page: pdfjsLib.PDFPageProxy,
    pageNum: number,
  ): Promise<ParsedPage> {
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1.0 });

    const blocks: TextBlock[] = [];
    const lines: string[] = [];

    // Process text items and group into blocks
    let lastY = 0;
    let currentBlock: TextBlock | null = null;
    let blockText = '';

    for (const item of textContent.items) {
      if (!('str' in item)) continue;

      const text = item.str.trim();
      if (!text) continue;

      const y = item.transform[5];
      const x = item.transform[4];
      const fontSize = Math.abs(item.transform[0]);
      const fontName = item.fontName?.toLowerCase() || '';
      const isBold = fontName.includes('bold');

      // Determine block type based on font size and position
      const blockType = this.classifyBlock(text, fontSize, isBold, x);

      // If Y position changed significantly or block type changed, save current block
      if (currentBlock && (Math.abs(lastY - y) > 10 || currentBlock.type !== blockType)) {
        if (blockText.trim()) {
          currentBlock.text = blockText.trim();
          blocks.push(currentBlock);
          lines.push(currentBlock.text);
        }
        currentBlock = null;
        blockText = '';
      }

      // Start new block if needed
      if (!currentBlock) {
        currentBlock = {
          type: blockType,
          text: '',
          fontSize,
          fontWeight: isBold ? 'bold' : 'normal',
          x,
          y,
          width: item.width || 0,
          height: item.height || fontSize * 1.2,
        };
      }

      blockText += text + ' ';
      lastY = y;
    }

    // Push last block
    if (currentBlock && blockText.trim()) {
      currentBlock.text = blockText.trim();
      blocks.push(currentBlock);
      lines.push(currentBlock.text);
    }

    return {
      pageNumber: pageNum,
      text: lines.join('\n'),
      blocks,
    };
  }

  /**
   * Classify a text block based on its characteristics
   */
  private classifyBlock(
    text: string,
    fontSize: number,
    isBold: boolean,
    x: number,
  ): TextBlock['type'] {
    // Check for question patterns
    if (/^(Question|Questions|Q\.?)\s*\d+/i.test(text)) {
      return 'question';
    }

    // Check for option patterns (A., B., C., D. or (A), (B), etc.)
    if (/^[A-D][\.\)]\s+/.test(text) || /^\([a-d]\)\s*/.test(text)) {
      return 'option';
    }

    // Check for table-like content (multiple | characters)
    if ((text.match(/\|/g) || []).length >= 2) {
      return 'table';
    }

    // Check for list items
    if (/^[•\-\*]\s+/.test(text) || /^\d+\.\s+/.test(text)) {
      return 'list';
    }

    // Large/bold text at top of page is likely a heading
    if (isBold && fontSize > 14 && x < 50) {
      return 'heading';
    }

    // Default to paragraph
    return 'paragraph';
  }

  /**
   * Detect the exam title from the PDF content
   */
  private detectTitle(blocks: TextBlock[], rawText: string): string {
    // Look for first heading block
    const headingBlock = blocks.find((b) => b.type === 'heading');
    if (headingBlock && headingBlock.text.length > 3) {
      return headingBlock.text.substring(0, 100);
    }

    // Look for title patterns in first few lines
    const lines = rawText.split('\n').slice(0, 5);
    for (const line of lines) {
      const trimmed = line.trim();
      if (
        trimmed.length > 5 &&
        trimmed.length < 100 &&
        /IELTS|IELTS|test|exam|reading|listening/i.test(trimmed)
      ) {
        return trimmed;
      }
    }

    // Default title
    return 'IELTS Practice Test';
  }

  /**
   * Detect difficulty level from content hints
   */
  private detectLevel(text: string): 'Low' | 'Mid' | 'High' | 'Great' {
    const lowerText = text.toLowerCase();

    // Check for keywords indicating difficulty
    const hardWords = [
      'complex',
      'sophisticated',
      'elaborate',
      'intricate',
      'demanding',
      'challenging',
    ];
    const midWords = ['moderate', 'intermediate', 'standard', 'typical'];
    const easyWords = ['basic', 'simple', 'beginner', 'elementary', 'introductory'];

    const hardCount = hardWords.filter((w) => lowerText.includes(w)).length;
    const midCount = midWords.filter((w) => lowerText.includes(w)).length;
    const easyCount = easyWords.filter((w) => lowerText.includes(w)).length;

    if (hardCount > easyCount && hardCount > midCount) return 'High';
    if (easyCount > hardCount && easyCount > midCount) return 'Low';
    return 'Mid';
  }

  /**
   * Extract text only (without structure) - utility method
   */
  async extractTextOnly(fileBuffer: Buffer): Promise<string> {
    this.validateFile(fileBuffer);

    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(fileBuffer),
      useSystemFonts: true,
    });

    const pdfDocument = await loadingTask.promise;
    let text = '';

    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();

      for (const item of textContent.items) {
        if ('str' in item) {
          text += item.str + ' ';
        }
      }
      text += '\n\n';
    }

    return text.trim();
  }
}

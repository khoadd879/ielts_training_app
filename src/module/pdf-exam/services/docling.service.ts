import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  ParsedPage,
  TextBlock,
  ParsedDocumentProfile,
  ExtractedExamData,
} from './pdf-parser.service';

interface DoclingConversionResponse {
  document: {
    md_content: string;
    text_content: string;
    json_content?: Record<string, unknown>;
  };
  status: string;
  processing_time: number;
}

@Injectable()
export class DoclingService {
  private readonly logger = new Logger(DoclingService.name);
  private readonly doclingClient: AxiosInstance;
  private readonly doclingUrl: string;
  private isAvailable = false;

  constructor(private readonly configService: ConfigService) {
    this.doclingUrl =
      this.configService.get<string>('DOCLING_SERVE_URL') ||
      'http://localhost:5001';

    this.doclingClient = axios.create({
      baseURL: this.doclingUrl,
      timeout: 120000, // 2 minute timeout for large PDFs
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    // Check availability asynchronously
    this.checkAvailability().catch((err) => {
      this.logger.warn(`Docling service not available: ${err.message}`);
    });
  }

  private async checkAvailability(): Promise<void> {
    try {
      const response = await this.doclingClient.get('/health', {
        timeout: 5000,
      });
      this.isAvailable = response.status === 200;
      this.logger.log(
        `Docling service is ${this.isAvailable ? 'available' : 'unavailable'}`,
      );
    } catch {
      this.isAvailable = false;
    }
  }

  isDoclingAvailable(): boolean {
    return this.isAvailable;
  }

  /**
   * Convert PDF to structured text using Docling REST API
   */
  async convertPdf(
    fileBuffer: Buffer,
    filename: string,
  ): Promise<{
    text: string;
    markdown: string;
    confidence: number;
    warnings: string[];
  }> {
    // Re-probe availability on each call. The constructor probe runs once at
    // boot; if Docling comes up later (or restarts), the cached `isAvailable`
    // flag would otherwise stick at `false` and force the pdfjs-dist fallback.
    if (!this.isAvailable) {
      await this.checkAvailability();
    }
    if (!this.isAvailable) {
      throw new ServiceUnavailableException(
        'Docling service is not available. Please try again later.',
      );
    }

    try {
      const formData = new FormData();
      const uint8Array = new Uint8Array(fileBuffer);
      const blob = new Blob([uint8Array], { type: 'application/pdf' });
      // docling-serve >= v1.x expects the field name `files` (plural, array)
      // instead of the legacy `file` (single). Sending `file` returns 422.
      formData.append('files', blob, filename);

      const response = await this.doclingClient.post<DoclingConversionResponse>(
        '/v1/convert/file',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          params: {
            from_formats: ['pdf'],
            to_formats: ['json', 'markdown'],
            do_ocr: true,
            ocr_preset: 'auto',
            ocr_lang: ['en'],
            table_mode: 'accurate',
          },
        },
      );

      const { document } = response.data;
      // docling-serve v1.x only populates `text_content` when the legacy text
      // export option is requested. The default response carries only
      // `md_content` + `json_content`, so fall back to markdown when text is
      // empty — markdown still preserves headings, lists, and paragraphs that
      // the downstream structure-analyzer relies on.
      const text = document.text_content || '';
      const markdown = document.md_content || '';
      const effectiveText = text.length > 0 ? text : markdown;

      // Calculate confidence based on text extraction success
      const textDensity = effectiveText.length;
      const confidence = Math.min(0.98, Math.max(0.6, textDensity / 1000));

      const warnings: string[] = [];
      if (effectiveText.length < 200) {
        warnings.push('Low text extraction - PDF may be image-based');
      }
      if (text.length === 0 && markdown.length > 0) {
        warnings.push(
          'Docling returned no text_content; using markdown as fallback source',
        );
      }

      return {
        text: effectiveText,
        markdown,
        confidence,
        warnings,
      };
    } catch (error) {
      this.logger.error('Docling conversion failed', error);
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
          this.isAvailable = false;
          throw new ServiceUnavailableException(
            'Docling service connection failed',
          );
        }
        throw new ServiceUnavailableException(
          `Docling conversion failed: ${error.message}`,
        );
      }
      throw new ServiceUnavailableException('Docling conversion failed');
    }
  }

  /**
   * Convert PDF from URL using Docling REST API
   */
  async convertUrl(sourceUrl: string): Promise<{
    text: string;
    markdown: string;
    confidence: number;
    warnings: string[];
  }> {
    if (!this.isAvailable) {
      await this.checkAvailability();
    }
    if (!this.isAvailable) {
      throw new ServiceUnavailableException(
        'Docling service is not available. Please try again later.',
      );
    }

    try {
      const response = await this.doclingClient.post<DoclingConversionResponse>(
        '/v1/convert/source',
        {
          sources: [{ kind: 'http', url: sourceUrl }],
        },
        {
          params: {
            from_formats: ['pdf'],
            to_formats: ['json', 'markdown'],
            do_ocr: true,
            ocr_preset: 'auto',
            ocr_lang: ['en'],
            table_mode: 'accurate',
          },
        },
      );

      const { document } = response.data;
      const text = document.text_content || '';
      const markdown = document.md_content || '';
      const effectiveText = text.length > 0 ? text : markdown;

      const textDensity = effectiveText.length;
      const confidence = Math.min(0.98, Math.max(0.6, textDensity / 1000));

      const warnings: string[] = [];
      if (effectiveText.length < 200) {
        warnings.push('Low text extraction - PDF may be image-based');
      }
      if (text.length === 0 && markdown.length > 0) {
        warnings.push(
          'Docling returned no text_content; using markdown as fallback source',
        );
      }

      return {
        text: effectiveText,
        markdown,
        confidence,
        warnings,
      };
    } catch (error) {
      this.logger.error('Docling URL conversion failed', error);
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
          this.isAvailable = false;
          throw new ServiceUnavailableException(
            'Docling service connection failed',
          );
        }
        throw new ServiceUnavailableException(
          `Docling conversion failed: ${error.message}`,
        );
      }
      throw new ServiceUnavailableException('Docling conversion failed');
    }
  }

  /**
   * Refresh availability status
   */
  async refreshAvailability(): Promise<boolean> {
    await this.checkAvailability();
    return this.isAvailable;
  }
}

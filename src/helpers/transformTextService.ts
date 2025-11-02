// src/some/some.service.ts
import { Injectable } from '@nestjs/common';
import { sentenceCase } from './utils';

@Injectable()
export class SomeService {
  processText(input: string): string {
    const formattedText = sentenceCase(input);
    return `Processed text: ${formattedText}`;
  }
}

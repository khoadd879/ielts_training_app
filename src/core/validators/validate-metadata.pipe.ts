import {
  PipeTransform,
  Injectable,
  BadRequestException,
  ArgumentMetadata,
} from '@nestjs/common';
import { QuestionMetadataValidator } from './question-metadata.validator';
import { QuestionType } from '../types/question-metadata.types';

export interface QuestionWithMetadata {
  questionType: QuestionType;
  metadata: unknown;
}

@Injectable()
export class ValidateMetadataPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if (!value || !value.questionType || !value.metadata) {
      return value;
    }

    try {
      value.metadata = QuestionMetadataValidator.validate(
        value.questionType,
        value.metadata,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Unknown question type')) {
        throw new BadRequestException(errorMessage);
      }
      throw new BadRequestException(
        `Invalid metadata for question type ${value.questionType}: ${errorMessage}`,
      );
    }

    return value;
  }
}

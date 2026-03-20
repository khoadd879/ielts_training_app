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
      if (error.message.includes('Unknown question type')) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException(
        `Invalid metadata for question type ${value.questionType}: ${error.message}`,
      );
    }

    return value;
  }
}

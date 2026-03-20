import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { QuestionMetadataValidator } from './question-metadata.validator';
import { QuestionType } from '../types/question-metadata.types';

export function IsValidMetadata(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidMetadata',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!value || typeof value !== 'object') {
            return false;
          }

          const questionType = (args.object as any).questionType;
          if (!questionType) {
            return false;
          }

          try {
            QuestionMetadataValidator.validate(
              questionType as QuestionType,
              value,
            );
            return true;
          } catch {
            return false;
          }
        },
        defaultMessage(args: ValidationArguments) {
          const questionType = (args.object as any).questionType;
          return `Invalid metadata for question type: ${questionType}`;
        },
      },
    });
  };
}

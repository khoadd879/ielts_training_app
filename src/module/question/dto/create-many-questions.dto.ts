import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested, Validate } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateQuestionDto } from './create-question.dto';
import { QuestionMetadataValidator } from '../../../core/validators/question-metadata.validator';

/**
 * Custom validator that runs QuestionMetadataValidator.validateMultiple on the questions array.
 * This ensures bulk-created questions have valid metadata matching their questionType.
 */
class MetadataBulkValidator {
  validate(questions: CreateQuestionDto[]): boolean {
    const arrayToValidate = questions.map((q) => ({
      questionType: q.questionType as any,
      metadata: q.metadata,
    }));
    QuestionMetadataValidator.validateMultiple(arrayToValidate);
    return true;
  }

  defaultMessage(): string {
    return 'One or more questions have invalid metadata for their question type';
  }
}

export class CreateManyQuestionsDto {
  @ApiProperty({ type: [CreateQuestionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  @Validate(MetadataBulkValidator)
  questions: CreateQuestionDto[];
}

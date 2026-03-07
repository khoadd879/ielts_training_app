import { PartialType } from '@nestjs/swagger';
import { CreateQuestionGroupDto } from './create-question-group.dto';

export class UpdateQuestionGroupDto extends PartialType(CreateQuestionGroupDto) {}

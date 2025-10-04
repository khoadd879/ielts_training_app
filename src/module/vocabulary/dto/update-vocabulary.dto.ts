import { CreateVocabularyDto } from './create-vocabulary.dto';

export class UpdateVocabularyDto extends CreateVocabularyDto {
  lastReviewed?: Date;

  correctStreak: number;

  xp: number;
}

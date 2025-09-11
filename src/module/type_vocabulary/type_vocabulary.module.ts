import { Module } from '@nestjs/common';
import { TypeVocabularyService } from './type_vocabulary.service';
import { TypeVocabularyController } from './type_vocabulary.controller';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [TypeVocabularyController],
  providers: [TypeVocabularyService],
  exports: [TypeVocabularyService],
})
export class TypeVocabularyModule {}

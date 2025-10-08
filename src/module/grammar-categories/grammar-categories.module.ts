import { Module } from '@nestjs/common';
import { GrammarCategoriesService } from './grammar-categories.service';
import { GrammarCategoriesController } from './grammar-categories.controller';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [GrammarCategoriesController],
  providers: [GrammarCategoriesService],
})
export class GrammarCategoriesModule {}

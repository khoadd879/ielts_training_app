import {
  BadGatewayException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateGrammarDto } from './dto/create-grammar.dto';
import { UpdateGrammarDto } from './dto/update-grammar.dto';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class GrammarService {
  constructor(private readonly databaseService: DatabaseService) {}

  async verifyCategoryOwnership(idGrammarCategory: string, idUser: string) {
    const user = await this.databaseService.user.findUnique({
      where: { idUser },
    });

    if (!user) {
      throw new ForbiddenException('User not found.');
    }

    const category = await this.databaseService.grammarCategory.findFirst({
      where: {
        idGrammarCategory,
        OR: [{ idUser }, { idUser: null }],
      },
    });

    if (!category) {
      throw new ForbiddenException(
        'Grammar category not found or you do not have permission to access it.',
      );
    }

    if (category.idUser === null) {
      if (user.role !== 'ADMIN') {
        throw new ForbiddenException(
          'You cannot add grammar to a system category.',
        );
      }
    }
  }

  async create(createGrammarDto: CreateGrammarDto, idUser: string) {
    const { idGrammarCategory, title, explanation, commonMistakes, examples } =
      createGrammarDto;

    await this.verifyCategoryOwnership(idGrammarCategory, idUser);

    const data = await this.databaseService.grammar.create({
      data: {
        idGrammarCategory,
        title,
        explanation,
        commonMistakes,
        examples,
      },
    });

    return {
      message: 'Grammar created succesfully',
      data,
      status: 200,
    };
  }

  async findAllInGrammarCategories(idGrammarCategory: string) {
    const data = await this.databaseService.grammar.findMany({
      where: {
        idGrammarCategory,
      },
    });

    return {
      message: 'Grammar retrieved succesfully',
      data,
      status: 200,
    };
  }

  async findOne(id: string) {
    const data = await this.databaseService.grammar.findUnique({
      where: {
        idGrammar: id,
      },
    });

    if (!data) throw new BadGatewayException('Grammar not found');

    return {
      message: 'Grammar retrieved succesfully',
      data,
      statsu: 200,
    };
  }

  async update(id: string, updateGrammarDto: UpdateGrammarDto, idUser: string) {
    const { idGrammarCategory, title, explanation, commonMistakes, examples } =
      updateGrammarDto;

    if (idGrammarCategory) {
      await this.verifyCategoryOwnership(idGrammarCategory, idUser);
    }

    const data = await this.databaseService.grammar.update({
      where: {
        idGrammar: id,
      },
      data: {
        idGrammarCategory,
        title,
        explanation,
        commonMistakes,
        examples,
      },
    });

    return {
      message: 'Grammar updated succesfully',
      data,
      statsu: 200,
    };
  }

  // Bên trong GrammarService

  async remove(id: string, idUser: string) {
    // Thêm idUser
    const grammarToDelete = await this.databaseService.grammar.findUnique({
      where: { idGrammar: id },
      select: {
        category: {
          select: { idGrammarCategory: true },
        },
      },
    });

    if (!grammarToDelete) {
      throw new NotFoundException('Grammar not found');
    }

    const grammarCategory =
      await this.databaseService.grammarCategory.findUnique({
        where: {
          idGrammarCategory: grammarToDelete.category.idGrammarCategory,
        },
      });

    console.log(grammarCategory);

    if (!grammarCategory) {
      throw new NotFoundException('Grammar category not found');
    }

    if (grammarCategory.idUser !== idUser) {
      throw new ForbiddenException(
        'You are not allowed to delete this grammar.',
      );
    }

    await this.databaseService.grammar.delete({
      where: { idGrammar: id },
    });

    return {
      message: 'Grammar deleted successfully',
      status: 200,
    };
  }
}

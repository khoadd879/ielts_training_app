import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateGrammarDto } from './dto/create-grammar.dto';
import { UpdateGrammarDto } from './dto/update-grammar.dto';
import { DatabaseService } from 'src/database/database.service';
import { Role } from '@prisma/client';

@Injectable()
export class GrammarService {
  constructor(private readonly databaseService: DatabaseService) {}

  async createAndAssignToCategory(
    createGrammarDto: CreateGrammarDto,
    idUser: string,
  ) {
    const {
      idGrammarCategory,
      title,
      explanation,
      commonMistakes,
      examples,
      level,
      order,
    } = createGrammarDto;

    const categoryExists =
      await this.databaseService.grammarCategory.findUnique({
        where: { idGrammarCategory },
      });

    if (!categoryExists) {
      throw new NotFoundException('Grammar category not found.');
    }

    const user = await this.databaseService.user.findUnique({
      where: { idUser },
    });
    if (!user || (user.role !== Role.ADMIN && user.role !== Role.GIAOVIEN)) {
      throw new ForbiddenException(
        'You do not have permission to perform this action.',
      );
    }

    const transactionResult = await this.databaseService.$transaction(
      async (prisma) => {
        const newGrammar = await prisma.grammar.create({
          data: {
            title,
            explanation,
            commonMistakes,
            examples,
            level,
            order,
          },
        });

        await prisma.grammarsOnCategories.create({
          data: {
            idGrammar: newGrammar.idGrammar,
            idGrammarCategory: idGrammarCategory,
            assignedBy: idUser,
          },
        });

        return newGrammar;
      },
    );

    return {
      message: 'Grammar created and assigned to category successfully',
      data: transactionResult,
      status: 201,
    };
  }

  async updateGrammar(
    idGrammar: string,
    updateGrammarDto: UpdateGrammarDto,
    idUser: string,
  ) {
    const existingGrammar = await this.databaseService.grammar.findUnique({
      where: { idGrammar },
    });

    if (!existingGrammar) {
      throw new BadRequestException('Grammar not found.');
    }

    const user = await this.databaseService.user.findUnique({
      where: { idUser },
    });
    if (!user || (user.role !== Role.ADMIN && user.role !== Role.GIAOVIEN)) {
      throw new ForbiddenException(
        'You do not have permission to perform this action.',
      );
    }

    const { title, explanation, commonMistakes, examples, level, order } =
      updateGrammarDto;

    const data = await this.databaseService.grammar.update({
      where: { idGrammar },
      data: {
        title,
        explanation,
        commonMistakes,
        examples,
        level,
        order,
      },
    });

    return {
      message: 'Grammar updated successfully',
      data,
      status: 200,
    };
  }

  async remove(idGrammar: string, idUser: string) {
    const existingGrammar = await this.databaseService.grammar.findUnique({
      where: { idGrammar },
    });
    if (!existingGrammar) {
      throw new BadRequestException('Grammar not found.');
    }
    const user = await this.databaseService.user.findUnique({
      where: { idUser },
    });
    if (!user || (user.role !== Role.ADMIN && user.role !== Role.GIAOVIEN)) {
      throw new ForbiddenException(
        'You do not have permission to perform this action.',
      );
    }

    await this.databaseService.grammar.delete({
      where: { idGrammar },
    });

    return {
      message: 'Grammar deleted successfully',
      status: 200,
    };
  }

  async findAll() {
    const data = await this.databaseService.grammar.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return {
      message: 'Grammars retrieved successfully',
      data,
      status: 200,
    };
  }

  async findAllInUserCategory(idGrammarCategory: string, idUser: string) {
    const category = await this.databaseService.grammarCategory.findFirst({
      where: { idGrammarCategory, idUser },
    });
    if (!category) {
      throw new ForbiddenException('Category not found or access denied.');
    }

    const data = await this.databaseService.grammarsOnCategories.findMany({
      where: { idGrammarCategory },
      include: {
        grammar: true,
      },
    });

    const grammars = data.map((item) => item.grammar);

    return {
      message: 'Grammar in category retrieved successfully',
      data: grammars,
      status: 200,
    };
  }

  async addGrammarToCategory(
    idGrammarCategory: string,
    idGrammar: string,
    idUser: string,
  ) {
    const category = await this.databaseService.grammarCategory.findFirst({
      where: { idGrammarCategory, idUser },
    });
    if (!category) {
      throw new ForbiddenException('Category not found or access denied.');
    }

    const grammar = await this.databaseService.grammar.findUnique({
      where: { idGrammar },
    });
    if (!grammar) {
      throw new NotFoundException('Grammar not found.');
    }

    const data = await this.databaseService.grammarsOnCategories.create({
      data: {
        idGrammarCategory,
        idGrammar,
        assignedBy: idUser,
      },
    });

    return {
      message: 'Grammar added to category successfully',
      data,
      status: 200,
    };
  }

  async moveGrammarToCategory(
    idGrammarCategory: string,
    idGrammar: string,
    idUser: string,
  ) {
    const category = await this.databaseService.grammarCategory.findFirst({
      where: { idGrammarCategory, idUser },
    });

    if (!category) {
      throw new ForbiddenException('Category not found or access denied.');
    }

    const grammar = await this.databaseService.grammar.findUnique({
      where: { idGrammar },
    });
    if (!grammar) {
      throw new NotFoundException('Grammar not found.');
    }

    const existingRelation =
      await this.databaseService.grammarsOnCategories.findUnique({
        where: {
          idGrammarCategory_idGrammar: {
            idGrammarCategory,
            idGrammar,
          },
        },
      });

    if (!existingRelation) {
      throw new BadRequestException(
        'Grammar is not currently assigned to this category.',
      );
    }

    const data = await this.databaseService.grammarsOnCategories.update({
      where: {
        idGrammarCategory_idGrammar: {
          idGrammarCategory,
          idGrammar,
        },
      },
      data: {
        idGrammarCategory,
        assignedBy: idUser,
      },
    });

    return {
      message: 'Grammar moved to new category successfully',
      data,
      status: 200,
    };
  }

  async removeGrammarFromCategory(
    idGrammarCategory: string,
    idGrammar: string,
    idUser: string,
  ) {
    const category = await this.databaseService.grammarCategory.findFirst({
      where: { idGrammarCategory, idUser },
    });
    if (!category) {
      throw new ForbiddenException('Category not found or access denied.');
    }

    await this.databaseService.grammarsOnCategories.delete({
      where: {
        idGrammarCategory_idGrammar: {
          idGrammarCategory,
          idGrammar,
        },
      },
    });

    return {
      message: 'Grammar removed from category successfully',
      status: 200,
    };
  }
}

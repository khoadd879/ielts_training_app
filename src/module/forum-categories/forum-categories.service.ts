import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateForumCategoryDto } from './dto/create-forum-category.dto';
import { UpdateForumCategoryDto } from './dto/update-forum-category.dto';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class ForumCategoriesService {
  constructor(private readonly databaseService: DatabaseService) {}

  async createForumCategories(createForumCategoryDto: CreateForumCategoryDto) {
    const { nameForum, description } = createForumCategoryDto;

    const data = await this.databaseService.forumCategories.create({
      data: {
        nameForum,
        description: description ?? null,
      },
    });

    return {
      message: 'Forum categories created successfully',
      data,
      status: 200,
    };
  }

  async findAllForumCategories() {
    const data = await this.databaseService.forumCategories.findMany();

    return {
      message: 'Forum categories retrieved successfully',
      data,
      status: 200,
    };
  }

  async findOneForumCategory(idForumCategories: string) {
    const data = await this.databaseService.forumCategories.findUnique({
      where: {
        idForumCategories,
      },
    });

    if (!data) throw new BadRequestException('Forum Category not found');

    return {
      message: 'Forum categories retrieved successfully',
      data,
      status: 200,
    };
  }

  async updateForumCategories(
    idForumCategories: string,
    updateForumCategoryDto: UpdateForumCategoryDto,
  ) {
    const { nameForum, description } = updateForumCategoryDto;

    const data = await this.databaseService.forumCategories.update({
      where: {
        idForumCategories,
      },
      data: {
        nameForum,
        description: description ?? null,
      },
    });

    return {
      message: 'Forum categories updated successfully',
      data,
      status: 200,
    };
  }

  async removeForumCategory(idForumCategories: string) {
    const data = await this.databaseService.forumCategories.delete({
      where: { idForumCategories },
    });

    if (!data) throw new BadRequestException('Forum Category not found');
    return {
      message: 'Forum categories deleted successfully',
      status: 200,
    };
  }
}

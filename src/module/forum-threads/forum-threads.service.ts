import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateForumThreadDto } from './dto/create-forum-thread.dto';
import { UpdateForumThreadDto } from './dto/update-forum-thread.dto';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class ForumThreadsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async existingUser(idUser: string) {
    const existingUser = await this.databaseService.user.findUnique({
      where: {
        idUser,
      },
    });

    if (!existingUser) throw new BadRequestException('User not found');
  }

  async existingForumCategories(idForumCategories: string) {
    const existingForumCategories =
      await this.databaseService.forumCategories.findUnique({
        where: {
          idForumCategories,
        },
      });

    if (!existingForumCategories)
      throw new BadRequestException('Forum Category not found');
  }

  async createForumThread(createForumThreadDto: CreateForumThreadDto) {
    const { idForumCategories, idUser, title, content } = createForumThreadDto;
    await this.existingUser(idUser);
    await this.existingForumCategories(idForumCategories);

    const data = await this.databaseService.forumThreads.create({
      data: {
        idForumCategories,
        idUser,
        title,
        content,
      },
    });

    return {
      message: 'Forum Thread created successfully',
      data,
      status: 200,
    };
  }

  async findAllByIdForumCategories(idForumCategories: string) {
    this.existingForumCategories(idForumCategories);

    const data = await this.databaseService.forumThreads.findMany({
      where: {
        idForumCategories,
      },
    });

    return {
      message: 'Forum Thread retrieved successfully',
      data,
      status: 200,
    };
  }

  async findForumThread(idForumThreads: string) {
    const data = await this.databaseService.forumThreads.findUnique({
      where: {
        idForumThreads,
      },
    });

    if (!data) throw new BadRequestException('Forum thread not found');

    return {
      message: 'Forum Thread retrieved successfully',
      data,
      status: 200,
    };
  }

  async updateForumThread(
    idForumThreads: string,
    updateForumThreadDto: UpdateForumThreadDto,
  ) {
    const { idForumCategories, idUser, title, content } = updateForumThreadDto;
    await this.existingUser(idUser);
    const existingForumThread =
      await this.databaseService.forumThreads.findUnique({
        where: {
          idForumThreads,
        },
      });

    if (!existingForumThread)
      throw new BadRequestException('Forum thread not found');

    const data = await this.databaseService.forumThreads.update({
      where: {
        idForumThreads,
      },
      data: {
        idForumCategories,
        idUser,
        title,
        content,
      },
    });

    return {
      message: 'Forum Thread updated successfully',
      data,
      status: 200,
    };
  }

  async removeForumThread(idForumThreads: string) {
    const data = await this.databaseService.forumThreads.delete({
      where: {
        idForumThreads,
      },
    });

    if (!data) throw new BadRequestException('Forum thread not found');

    return {
      message: 'Forum Thread retrieved successfully',
      status: 200,
    };
  }
}

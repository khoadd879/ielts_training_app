import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateForumPostDto } from './dto/create-forum-post.dto';
import { UpdateForumPostDto } from './dto/update-forum-post.dto';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class ForumPostService {
  constructor(private readonly databaseService: DatabaseService) {}

  async existingUser(idUser: string) {
    const existingUser = await this.databaseService.user.findUnique({
      where: {
        idUser,
      },
    });

    if (!existingUser) throw new BadRequestException('User not found');
  }

  async existingForumThreads(idForumThreads: string) {
    const existingForumCategories =
      await this.databaseService.forumThreads.findUnique({
        where: {
          idForumThreads,
        },
      });

    if (!existingForumCategories)
      throw new BadRequestException('Forum Category not found');
  }

  async createForumPost(createForumPostDto: CreateForumPostDto) {
    const { idForumThreads, idUser, content } = createForumPostDto;

    this.existingUser(idUser);
    this.existingForumThreads(idForumThreads);

    const data = await this.databaseService.forumPost.create({
      data: {
        idForumThreads,
        idUser,
        content,
      },
    });

    return {
      message: 'Forum Post created successfully',
      data,
      status: 200,
    };
  }

  async findAllByIdForumThread(idForumThreads: string) {
    this.existingForumThreads(idForumThreads);

    const data = await this.databaseService.forumPost.findMany({
      where: {
        idForumThreads,
      },
    });

    return {
      message: 'Forum Post retrieved successfully',
      data,
      status: 200,
    };
  }

  async findForumPost(idForumPost: string) {
    const data = await this.databaseService.forumPost.findUnique({
      where: {
        idForumPost,
      },
    });

    if (!data) throw new BadRequestException('Forum Post not found');

    return {
      message: 'Forum Post retrieved successfully',
      data,
      status: 200,
    };
  }

  async updateForumPost(
    idForumPost: string,
    updateForumPostDto: UpdateForumPostDto,
  ) {
    const { idForumThreads, idUser, content } = updateForumPostDto;

    this.existingUser(idUser);
    this.existingForumThreads(idForumThreads);

    const data = await this.databaseService.forumPost.update({
      where: {
        idForumPost,
      },
      data: {
        idForumThreads,
        idUser,
        content,
      },
    });

    return {
      message: 'Forum Post updated successfully',
      data,
      status: 200,
    };
  }

  async removeForumPost(idForumPost: string) {
    const data = await this.databaseService.forumPost.delete({
      where: {
        idForumPost,
      },
    });

    if (!data) throw new BadRequestException('Forum post not found');

    return {
      message: 'Forum Post retrieved successfully',
      status: 200,
    };
  }
}

import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
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

  async createForumThread(createForumThreadDto: CreateForumThreadDto) {
    const { idUser, title, content } = createForumThreadDto;
    await this.existingUser(idUser);

    const data = await this.databaseService.forumThreads.create({
      data: {
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

  async findAllForumThreads() {
    const threads = await this.databaseService.forumThreads.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        user: {
          select: {
            idUser: true,
            nameUser: true,
            avatar: true,
          },
        },
        _count: {
          select: { forumPost: true },
        },
        forumPost: {
          orderBy: { created_at: 'desc' },
          take: 1,
          select: { created_at: true },
        },
      },
    });

    const data = threads.map((t) => ({
      idForumThreads: t.idForumThreads,
      idUser: t.idUser,
      title: t.title,
      content: t.content,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
      author: t.user,
      postCount: t._count.forumPost,
      lastPostAt: t.forumPost[0]?.created_at ?? t.created_at,
      isHot: t._count.forumPost >= 10,
    }));

    return {
      message: 'Forum Thread retrieved successfully',
      data,
      status: 200,
    };
  }

  async findForumThread(idForumThreads: string) {
    const thread = await this.databaseService.forumThreads.findUnique({
      where: { idForumThreads },
      include: {
        user: {
          select: {
            idUser: true,
            nameUser: true,
            avatar: true,
          },
        },
        _count: { select: { forumPost: true } },
      },
    });

    if (!thread) throw new BadRequestException('Forum thread not found');

    const data = {
      idForumThreads: thread.idForumThreads,
      idUser: thread.idUser,
      title: thread.title,
      content: thread.content,
      createdAt: thread.created_at,
      updatedAt: thread.updated_at,
      author: thread.user,
      postCount: thread._count.forumPost,
      isHot: thread._count.forumPost >= 10,
    };

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
    const { idUser, title, content } = updateForumThreadDto;
    await this.existingUser(idUser);
    const existingForumThread =
      await this.databaseService.forumThreads.findUnique({
        where: {
          idForumThreads,
        },
      });

    if (!existingForumThread)
      throw new BadRequestException('Forum thread not found');
    if (existingForumThread.idUser !== idUser) {
      throw new ForbiddenException('You are not authorized to update this thread');
    }

    const data = await this.databaseService.forumThreads.update({
      where: {
        idForumThreads,
      },
      data: {
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

  async removeForumThread(idForumThreads: string, idUser: string) {
    const existing = await this.databaseService.forumThreads.findUnique({
      where: {
        idForumThreads,
      },
    });

    if (!existing) throw new BadRequestException('Forum thread not found');
    if (existing.idUser !== idUser) {
      throw new ForbiddenException('You are not authorized to delete this thread');
    }

    await this.databaseService.forumThreads.delete({
      where: {
        idForumThreads,
      },
    });

    return {
      message: 'Forum Thread deleted successfully',
      status: 200,
    };
  }
}

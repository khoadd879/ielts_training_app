import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { CreateForumThreadDto } from './dto/create-forum-thread.dto';
import { UpdateForumThreadDto } from './dto/update-forum-thread.dto';
import { DatabaseService } from 'src/database/database.service';
import { Role } from '@prisma/client';

@Injectable()
export class ForumThreadsService {
  constructor(private readonly databaseService: DatabaseService) {}

  private isModeratorRole(role?: Role) {
    return role === Role.ADMIN || role === Role.GIAOVIEN;
  }

  async findUser(idUser: string) {
    const user = await this.databaseService.user.findUnique({
      where: { idUser },
    });
    if (!user) throw new BadRequestException('User not found');
    return user;
  }

  async assertCanManageThreads(idUser: string) {
    const user = await this.findUser(idUser);
    if (!this.isModeratorRole(user.role)) {
      throw new ForbiddenException(
        'Only admin or teacher can manage forum threads',
      );
    }
    return user;
  }

  async createForumThread(createForumThreadDto: CreateForumThreadDto) {
    const { idUser, title, content } = createForumThreadDto;
    await this.assertCanManageThreads(idUser);

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
          select: {
            forumPost: {
              where: {
                moderationStatus: {
                  in: ['AUTO_APPROVED', 'APPROVED'],
                },
              },
            },
          },
        },
        forumPost: {
          orderBy: { created_at: 'desc' },
          take: 1,
          where: {
            moderationStatus: {
              in: ['AUTO_APPROVED', 'APPROVED'],
            },
          },
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
        _count: {
          select: {
            forumPost: {
              where: {
                moderationStatus: {
                  in: ['AUTO_APPROVED', 'APPROVED'],
                },
              },
            },
          },
        },
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
    await this.assertCanManageThreads(idUser);
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
    await this.assertCanManageThreads(idUser);
    const existing = await this.databaseService.forumThreads.findUnique({
      where: {
        idForumThreads,
      },
    });

    if (!existing) throw new BadRequestException('Forum thread not found');

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

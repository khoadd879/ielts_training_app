import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateForumCommentDto } from './dto/create-forum-comment.dto';
import { UpdateForumCommentDto } from './dto/update-forum-comment.dto';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class ForumCommentService {
  constructor(private readonly databaseService: DatabaseService) {}

  async existingUser(idUser: string) {
    const existingUser = await this.databaseService.user.findUnique({
      where: {
        idUser,
      },
    });

    if (!existingUser) throw new BadRequestException('User not found');
  }

  async existingForumPost(idForumPost: string) {
    const existingForumCategories =
      await this.databaseService.forumPost.findUnique({
        where: {
          idForumPost,
        },
      });

    if (!existingForumCategories)
      throw new BadRequestException('Forum Post not found');
  }

  async createForumComment(createForumCommentDto: CreateForumCommentDto) {
    const { idForumPost, idUser, content } = createForumCommentDto;

    await this.existingForumPost(idForumPost);
    await this.existingUser(idUser);

    const data = await this.databaseService.forumComment.create({
      data: {
        idForumPost,
        idUser,
        content,
      },
    });

    return {
      message: 'Forum Comment created successfully',
      data,
      status: 200,
    };
  }

  async findAllByIdPost(idForumPost: string) {
    await this.existingForumPost(idForumPost);

    const data = await this.databaseService.forumComment.findMany({
      where: {
        idForumPost,
      },
    });

    return {
      message: 'Forum Thread retrieved successfully',
      data,
      status: 200,
    };
  }

  async findForumComment(idForumComment: string) {
    const data = await this.databaseService.forumComment.findUnique({
      where: {
        idForumComment,
      },
    });

    return {
      message: 'Forum Comment created successfully',
      data,
      status: 200,
    };
  }

  async updateForumcomment(
    idForumComment: string,
    updateForumCommentDto: UpdateForumCommentDto,
  ) {
    const { idForumPost, idUser, content } = updateForumCommentDto;

    await this.existingForumPost(idForumPost);
    await this.existingUser(idUser);

    const data = await this.databaseService.forumComment.update({
      where: {
        idForumComment,
      },
      data: {
        idForumPost,
        idUser,
        content,
      },
      include: {
        user: {
          select: {
            nameUser: true,
            avatar: true,
          },
        },
      },
    });

    return {
      message: 'Forum Comment updated successfully',
      data,
      status: 200,
    };
  }

  async removeForumComment(idForumComment: string) {
    const data = await this.databaseService.forumComment.delete({
      where: {
        idForumComment,
      },
    });

    if (!data) throw new BadRequestException('Forum comment not found');
    return {
      message: 'Forum Comment updated successfully',
      status: 200,
    };
  }
}

import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateForumPostDto } from './dto/create-forum-post.dto';
import { UpdateForumPostDto } from './dto/update-forum-post.dto';
import { DatabaseService } from 'src/database/database.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { dmmfToRuntimeDataModel } from '@prisma/client/runtime/library';

@Injectable()
export class ForumPostService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async existingUser(idUser: string) {
    const existingUser = await this.databaseService.user.findUnique({
      where: { idUser },
    });
    if (!existingUser) throw new BadRequestException('User not found');
  }

  async existingForumThreads(idForumThreads: string) {
    const existingForumThreads =
      await this.databaseService.forumThreads.findUnique({
        where: { idForumThreads },
      });
    if (!existingForumThreads)
      throw new BadRequestException('Forum thread not found');
  }

  async createForumPost(
    createForumPostDto: CreateForumPostDto,
    file?: Express.Multer.File,
  ) {
    const { idForumThreads, idUser, content } = createForumPostDto;

    await this.existingUser(idUser);
    await this.existingForumThreads(idForumThreads);

    let fileUrl: string | null = null;

    if (file) {
      const uploadResult = await this.cloudinaryService.uploadFile(file);
      fileUrl = uploadResult.secure_url;
    }

    const data = await this.databaseService.forumPost.create({
      data: {
        idForumThreads,
        idUser,
        content,
        file: fileUrl,
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
      message: 'Forum Post created successfully',
      data,
      status: 200,
    };
  }

  async findAllByIdForumThread(idForumThreads: string, idUser: string) {
    await this.existingForumThreads(idForumThreads);

    const data = await this.databaseService.forumPost.findMany({
      where: { idForumThreads },
      orderBy: { created_at: 'desc' },
      include: {
        user: {
          select: {
            idUser: true,
            nameUser: true,
            avatar: true,
          },
        },
        forumComment: {
          orderBy: {
            created_at: 'asc',
          },
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
                forumCommentLikes: true,
              },
            },
            forumCommentLikes: {
              where: {
                idUser,
              },
              select: {
                idUser: true,
              },
            },
          },
        },
        _count: {
          select: {
            forumPostLikes: true,
          },
        },
        forumPostLikes: {
          where: {
            idUser,
          },
          select: {
            idUser: true,
          },
        },
      },
    });

    const transformedPosts = data.map((post) => {
      const { _count, forumPostLikes, forumComment, ...restOfPost } = post;

      const transformedComments = forumComment.map((comment) => {
        const {
          _count: commentCount,
          forumCommentLikes: commentLikes,
          ...restOfComment
        } = comment;

        return {
          ...restOfComment,
          commentLikeCount: commentCount.forumCommentLikes,
          isCommentLikedByCurrentUser: commentLikes.length > 0,
        };
      });

      return {
        ...restOfPost,
        likeCount: _count.forumPostLikes,
        isLikedByCurrentUser: forumPostLikes.length > 0,
        forumComment: transformedComments,
      };
    });

    return {
      message: 'Forum posts retrieved successfully',
      data: transformedPosts,
      status: 200,
    };
  }

  async findForumPost(idForumPost: string, idUser: string) {
    await this.existingUser(idUser);

    const data = await this.databaseService.forumPost.findUnique({
      where: { idForumPost },
      include: {
        user: {
          select: {
            idUser: true,
            nameUser: true,
            avatar: true,
          },
        },
        forumComment: {
          orderBy: {
            created_at: 'asc',
          },
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
                forumCommentLikes: true,
              },
            },
            forumCommentLikes: {
              where: {
                idUser,
              },
              select: {
                idUser: true,
              },
            },
          },
        },
        _count: {
          select: {
            forumPostLikes: true,
          },
        },
        forumPostLikes: {
          where: {
            idUser,
          },
          select: {
            idUser: true,
          },
        },
      },
    });

    if (!data) throw new BadRequestException('Forum post not found');

    const { _count, forumPostLikes, forumComment, ...restOfPost } = data;

    const transformedComments = forumComment.map((comment) => {
      const {
        _count: commentCount,
        forumCommentLikes: commentLikes,
        ...restOfComment
      } = comment;

      return {
        ...restOfComment,
        commentLikeCount: commentCount.forumCommentLikes,
        isCommentLikedByCurrentUser: commentLikes.length > 0,
      };
    });

    const transformedPost = {
      ...restOfPost,
      likeCount: _count.forumPostLikes,
      isLikedByCurrentUser: forumPostLikes.length > 0,
      forumComment: transformedComments,
    };

    return {
      message: 'Forum post retrieved successfully',
      data: transformedPost,
      status: 200,
    };
  }

  async updateForumPost(
    idForumPost: string,
    updateForumPostDto: UpdateForumPostDto,
    file?: Express.Multer.File,
  ) {
    const { idForumThreads, idUser, content } = updateForumPostDto;

    await this.existingUser(idUser);
    await this.existingForumThreads(idForumThreads);

    let fileUrl = updateForumPostDto.file;

    if (file) {
      const uploadResult = await this.cloudinaryService.uploadFile(file);
      fileUrl = uploadResult.secure_url;
    }

    const data = await this.databaseService.forumPost.update({
      where: { idForumPost },
      data: {
        idForumThreads,
        idUser,
        content,
        file: fileUrl,
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
      message: 'Forum Post updated successfully',
      data,
      status: 200,
    };
  }

  async removeForumPost(idForumPost: string) {
    const existing = await this.databaseService.forumPost.findUnique({
      where: { idForumPost },
    });
    if (!existing) throw new BadRequestException('Forum post not found');

    await this.databaseService.forumPost.delete({
      where: { idForumPost },
    });

    return {
      message: 'Forum post deleted successfully',
      status: 200,
    };
  }
}

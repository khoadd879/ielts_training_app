import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateForumCommentLikeDto } from './dto/create-forum-comment-like.dto';
import { UpdateForumCommentLikeDto } from './dto/update-forum-comment-like.dto';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class ForumCommentLikesService {
  constructor(private readonly databaseService: DatabaseService) {}

  async existingUser(idUser: string) {
    const existingUser = await this.databaseService.user.findUnique({
      where: {
        idUser,
      },
    });

    if (!existingUser) throw new BadRequestException('User not found');
  }

  async existingForumComment(idForumComment: string) {
    const existingForumCategories =
      await this.databaseService.forumComment.findUnique({
        where: {
          idForumComment,
        },
      });

    if (!existingForumCategories)
      throw new BadRequestException('Forum comment not found');
  }

  async toggleLike(createForumCommentLikeDto: CreateForumCommentLikeDto) {
    const { idForumComment, idUser } = createForumCommentLikeDto;

    await this.existingForumComment(idForumComment);
    await this.existingUser(idUser);

    // Kiểm tra đã like chưa
    const existingLike =
      await this.databaseService.forumCommentLikes.findUnique({
        where: {
          idForumComment_idUser: {
            idForumComment,
            idUser,
          },
        },
      });

    if (existingLike) {
      // Nếu đã like thì unlike (xóa)
      await this.databaseService.forumCommentLikes.delete({
        where: {
          idForumComment_idUser: {
            idForumComment,
            idUser,
          },
        },
      });

      return {
        message: 'Unliked successfully',
        status: 200,
      };
    } else {
      // Nếu chưa like thì tạo mới
      const data = await this.databaseService.forumCommentLikes.create({
        data: {
          idForumComment,
          idUser,
        },
      });

      return {
        message: 'Liked successfully',
        data,
        status: 200,
      };
    }
  }
}

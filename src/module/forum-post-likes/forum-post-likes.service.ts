import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateForumPostLikeDto } from './dto/create-forum-post-like.dto';

@Injectable()
export class ForumPostLikesService {
  constructor(private readonly databaseService: DatabaseService) {}

  async existingUser(idUser: string) {
    const existingUser = await this.databaseService.user.findUnique({
      where: { idUser },
    });
    if (!existingUser) throw new BadRequestException('User not found');
  }

  async existingForumPost(idForumPost: string) {
    const existingForumPost = await this.databaseService.forumPost.findUnique({
      where: { idForumPost },
    });
    if (!existingForumPost)
      throw new BadRequestException('Forum post not found');
  }

  async toggleLike(createForumPostLikeDto: CreateForumPostLikeDto) {
    const { idForumPost, idUser } = createForumPostLikeDto;

    await this.existingForumPost(idForumPost);
    await this.existingUser(idUser);

    const existingLike = await this.databaseService.forumPostLikes.findUnique({
      where: {
        idForumPost_idUser: {
          idForumPost,
          idUser,
        },
      },
    });

    if (existingLike) {
      await this.databaseService.forumPostLikes.delete({
        where: {
          idForumPost_idUser: { idForumPost, idUser },
        },
      });
      return { message: 'Unliked successfully', status: 200 };
    }

    const data = await this.databaseService.forumPostLikes.create({
      data: { idForumPost, idUser },
    });
    return { message: 'Liked successfully', data, status: 200 };
  }
}

import { Injectable } from '@nestjs/common';
import { CreateForumPostLikeDto } from './dto/create-forum-post-like.dto';
import { UpdateForumPostLikeDto } from './dto/update-forum-post-like.dto';

@Injectable()
export class ForumPostLikesService {
  create(createForumPostLikeDto: CreateForumPostLikeDto) {
    return 'This action adds a new forumPostLike';
  }

  findAll() {
    return `This action returns all forumPostLikes`;
  }

  findOne(id: number) {
    return `This action returns a #${id} forumPostLike`;
  }

  update(id: number, updateForumPostLikeDto: UpdateForumPostLikeDto) {
    return `This action updates a #${id} forumPostLike`;
  }

  remove(id: number) {
    return `This action removes a #${id} forumPostLike`;
  }
}

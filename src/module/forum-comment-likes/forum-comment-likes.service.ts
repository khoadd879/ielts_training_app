import { Injectable } from '@nestjs/common';
import { CreateForumCommentLikeDto } from './dto/create-forum-comment-like.dto';
import { UpdateForumCommentLikeDto } from './dto/update-forum-comment-like.dto';

@Injectable()
export class ForumCommentLikesService {
  create(createForumCommentLikeDto: CreateForumCommentLikeDto) {
    return 'This action adds a new forumCommentLike';
  }

  findAll() {
    return `This action returns all forumCommentLikes`;
  }

  findOne(id: number) {
    return `This action returns a #${id} forumCommentLike`;
  }

  update(id: number, updateForumCommentLikeDto: UpdateForumCommentLikeDto) {
    return `This action updates a #${id} forumCommentLike`;
  }

  remove(id: number) {
    return `This action removes a #${id} forumCommentLike`;
  }
}

import { Controller, Post, Body } from '@nestjs/common';
import { ForumCommentLikesService } from './forum-comment-likes.service';
import { CreateForumCommentLikeDto } from './dto/create-forum-comment-like.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('forum-comment-likes')
export class ForumCommentLikesController {
  constructor(
    private readonly forumCommentLikesService: ForumCommentLikesService,
  ) {}

  @Post('toggle')
  async toggleLike(
    @Body() createForumCommentLikeDto: CreateForumCommentLikeDto,
  ) {
    return this.forumCommentLikesService.toggleLike(createForumCommentLikeDto);
  }
}

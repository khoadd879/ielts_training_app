import { Controller, Post, Body } from '@nestjs/common';
import { ForumPostLikesService } from './forum-post-likes.service';
import { CreateForumPostLikeDto } from './dto/create-forum-post-like.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiBearerAuth()
@ApiTags('Forum Post Likes')
@Controller('forum-post-likes')
export class ForumPostLikesController {
  constructor(private readonly forumPostLikesService: ForumPostLikesService) {}

  @Post('toggle')
  async toggleLike(@Body() createForumPostLikeDto: CreateForumPostLikeDto) {
    return this.forumPostLikesService.toggleLike(createForumPostLikeDto);
  }
}

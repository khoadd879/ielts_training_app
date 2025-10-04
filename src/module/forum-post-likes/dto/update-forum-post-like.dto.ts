import { PartialType } from '@nestjs/swagger';
import { CreateForumPostLikeDto } from './create-forum-post-like.dto';

export class UpdateForumPostLikeDto extends PartialType(CreateForumPostLikeDto) {}

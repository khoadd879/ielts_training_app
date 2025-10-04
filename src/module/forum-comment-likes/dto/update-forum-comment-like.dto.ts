import { PartialType } from '@nestjs/swagger';
import { CreateForumCommentLikeDto } from './create-forum-comment-like.dto';

export class UpdateForumCommentLikeDto extends PartialType(CreateForumCommentLikeDto) {}

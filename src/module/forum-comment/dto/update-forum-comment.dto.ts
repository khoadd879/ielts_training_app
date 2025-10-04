import { PartialType } from '@nestjs/swagger';
import { CreateForumCommentDto } from './create-forum-comment.dto';

export class UpdateForumCommentDto extends PartialType(CreateForumCommentDto) {}

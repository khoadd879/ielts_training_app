import { PartialType } from '@nestjs/swagger';
import { CreateForumThreadDto } from './create-forum-thread.dto';

export class UpdateForumThreadDto extends PartialType(CreateForumThreadDto) {}

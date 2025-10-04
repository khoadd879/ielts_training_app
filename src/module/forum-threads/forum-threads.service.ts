import { Injectable } from '@nestjs/common';
import { CreateForumThreadDto } from './dto/create-forum-thread.dto';
import { UpdateForumThreadDto } from './dto/update-forum-thread.dto';

@Injectable()
export class ForumThreadsService {
  create(createForumThreadDto: CreateForumThreadDto) {
    return 'This action adds a new forumThread';
  }

  findAll() {
    return `This action returns all forumThreads`;
  }

  findOne(id: number) {
    return `This action returns a #${id} forumThread`;
  }

  update(id: number, updateForumThreadDto: UpdateForumThreadDto) {
    return `This action updates a #${id} forumThread`;
  }

  remove(id: number) {
    return `This action removes a #${id} forumThread`;
  }
}

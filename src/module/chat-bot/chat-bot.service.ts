import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class ChatBotService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  private getUserKey(idUser: string) {
    return `chat:${idUser}`;
  }

  async saveMessage(idUser: string, message: string) {
    const key = this.getUserKey(idUser);
    const oldMessages = ((await this.cacheManager.get<string[]>(key)) ||
      []) as string[];
    const newMessages = [...oldMessages, message];
    await this.cacheManager.set(key, newMessages);
  }

  async getMessages(idUser: string): Promise<string[]> {
    const key = this.getUserKey(idUser);
    return ((await this.cacheManager.get<string[]>(key)) || []) as string[];
  }

  async clearMessages(idUser: string) {
    const key = this.getUserKey(idUser);
    await this.cacheManager.del(key);
  }
}

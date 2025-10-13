import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { GoogleGenAI } from '@google/genai';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ChatBotService {
  private readonly logger = new Logger(ChatBotService.name);

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {}

  // 🔹 Lấy instance Gemini
  private getAIInstance(): GoogleGenAI {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.error('GEMINI_API_KEY is missing');
      throw new BadRequestException('AI API key is not configured');
    }
    return new GoogleGenAI({ apiKey });
  }

  private getUserKey(idUser: string): string {
    return `chat:${idUser}`;
  }

  // 🔹 Lưu tin nhắn
  async saveMessage(idUser: string, sender: 'user' | 'bot', message: string) {
    const key = this.getUserKey(idUser);
    const oldRaw = await this.cacheManager.get<string>(key);
    const oldMessages = oldRaw ? JSON.parse(oldRaw) : [];
    const newMessages = [
      ...oldMessages,
      { sender, message, time: new Date().toISOString() },
    ];
    await this.cacheManager.set(key, JSON.stringify(newMessages), 86400); // TTL = 1 ngày
  }

  // 🔹 Lấy toàn bộ hội thoại
  async getMessages(idUser: string) {
    const key = this.getUserKey(idUser);
    const raw = await this.cacheManager.get<string>(key);
    return raw ? JSON.parse(raw) : [];
  }

  // 🔹 Xóa hội thoại
  async clearMessages(idUser: string) {
    const key = this.getUserKey(idUser);
    await this.cacheManager.del(key);
  }

  // 🔹 Xử lý tin nhắn người dùng
  async handleUserMessage(idUser: string, message: string): Promise<string> {
    await this.saveMessage(idUser, 'user', message);

    const reply = await this.generateGeminiReply(idUser, message);

    await this.saveMessage(idUser, 'bot', reply);

    return reply;
  }

  // 🔹 Gọi Gemini để trả lời
  private async generateGeminiReply(
    idUser: string,
    latestMessage: string,
  ): Promise<string> {
    const messages = await this.getMessages(idUser);
    const cacheKey = `chatbot-reply:${idUser}:${latestMessage.trim()}`;
    const cached = await this.cacheManager.get<string>(cacheKey);

    if (cached) {
      this.logger.log(`Cache HIT for ${idUser}`);
      return cached;
    }

    const ai = this.getAIInstance();
    const prompt = this.buildPrompt(messages, latestMessage);

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
      });

      const rawText = response.text?.trim() ?? '';
      const reply = this.cleanReply(rawText);

      await this.cacheManager.set(cacheKey, reply, 900); // cache 15 phút
      return reply;
    } catch (error) {
      this.logger.error(' Gemini API error:', error);
      throw new BadRequestException('AI chatbot generation failed.');
    }
  }

  // 🔹 Tạo prompt
  private buildPrompt(
    messages: { sender: string; message: string }[],
    latest: string,
  ): string {
    const history = messages
      .map((m) => `${m.sender === 'user' ? 'User' : 'Bot'}: ${m.message}`)
      .join('\n');

    return `
You are IELTS Assistant AI.
Your role: help the user improve English for IELTS (Writing, Speaking, Vocabulary, etc.)
Respond in a natural, friendly tone.  
Be concise, educational, and clear.

Conversation so far:
${history}

User: ${latest}
Bot:
`;
  }

  // 🔹 Làm sạch text từ Gemini
  private cleanReply(text: string): string {
    return text.replace(/```(json|text)?/gi, '').trim();
  }
}

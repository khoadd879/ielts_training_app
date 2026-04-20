import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import type { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { ChatBotService } from './chat-bot.service';
import { RabbitMQService } from 'src/rabbitmq/rabbitmq.service';

describe('ChatBotService', () => {
  let service: ChatBotService;

  const store = new Map<string, string>();
  const cacheManager = {
    get: jest.fn(async (key: string) => store.get(key)),
    set: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    del: jest.fn(async (key: string) => {
      store.delete(key);
    }),
  } as unknown as Cache;

  beforeEach(async () => {
    store.clear();
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatBotService,
        {
          provide: CACHE_MANAGER,
          useValue: cacheManager,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: RabbitMQService,
          useValue: {
            publishChatbotAsk: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ChatBotService>(ChatBotService);
  });

  it('stores a bot message when a worker reply is handled', async () => {
    expect(typeof (service as any).handleWorkerReply).toBe('function');
    if (typeof (service as any).handleWorkerReply !== 'function') {
      return;
    }

    await (service as any).handleWorkerReply('user-1', 'Hello from worker');

    await expect(service.getMessages('user-1')).resolves.toEqual([
      expect.objectContaining({
        sender: 'bot',
        message: 'Hello from worker',
      }),
    ]);
  });
});

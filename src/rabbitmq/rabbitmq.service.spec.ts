import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { RabbitMQService } from './rabbitmq.service';
import { EXCHANGES, QUEUES, ROUTING_KEYS } from './rabbitmq.constants';

jest.mock('amqplib', () => ({
  connect: jest.fn(),
}));

describe('RabbitMQService', () => {
  let service: RabbitMQService;
  let mockChannel: {
    assertExchange: jest.Mock;
    assertQueue: jest.Mock;
    bindQueue: jest.Mock;
    consume: jest.Mock;
    close: jest.Mock;
    publish: jest.Mock;
  };

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();

    mockChannel = {
      assertExchange: jest.fn(),
      assertQueue: jest.fn(),
      bindQueue: jest.fn(),
      consume: jest.fn(),
      close: jest.fn(),
      publish: jest.fn(),
    };

    (amqp.connect as jest.Mock).mockResolvedValue({
      createChannel: jest.fn().mockResolvedValue(mockChannel),
      close: jest.fn(),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RabbitMQService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('amqp://guest:guest@localhost:5672'),
          },
        },
      ],
    }).compile();

    service = module.get<RabbitMQService>(RabbitMQService);
  });

  it('exposes a chatbot reply subscription API', () => {
    expect(typeof (service as any).subscribeChatbotReply).toBe('function');
  });

  it('binds and consumes the chatbot reply queue when a reply handler is registered', async () => {
    expect(typeof (service as any).subscribeChatbotReply).toBe('function');
    if (typeof (service as any).subscribeChatbotReply !== 'function') {
      return;
    }

    await service.onModuleInit();
    await (service as any).subscribeChatbotReply(jest.fn());

    expect(mockChannel.assertExchange).toHaveBeenCalledWith(
      EXCHANGES.CHATBOT,
      'direct',
      { durable: true },
    );
    expect(mockChannel.assertQueue).toHaveBeenCalledWith(QUEUES.CHATBOT_REPLY, {
      durable: true,
    });
    expect(mockChannel.bindQueue).toHaveBeenCalledWith(
      QUEUES.CHATBOT_REPLY,
      EXCHANGES.CHATBOT,
      ROUTING_KEYS.REPLY,
    );
    expect(mockChannel.consume).toHaveBeenCalledWith(
      QUEUES.CHATBOT_REPLY,
      expect.any(Function),
    );
  });
});

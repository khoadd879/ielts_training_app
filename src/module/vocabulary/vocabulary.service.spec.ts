import { Test, TestingModule } from '@nestjs/testing';
import { VocabularyService } from './vocabulary.service';
import { DatabaseService } from '../../database/database.service';
import { RabbitMQService } from '../../rabbitmq/rabbitmq.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';

describe('VocabularyService.suggestPost', () => {
  let service: VocabularyService;
  const mockDb: any = {};
  const mockRabbit: any = { publishVocabSuggest: jest.fn() };
  const mockCache: any = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
  };
  const mockConfig: any = { get: jest.fn().mockReturnValue(null) };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockCache.get.mockReset();
    mockCache.set.mockReset();
    mockCache.get.mockResolvedValue(null);
    mockCache.set.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VocabularyService,
        { provide: DatabaseService, useValue: mockDb },
        { provide: RabbitMQService, useValue: mockRabbit },
        { provide: CACHE_MANAGER, useValue: mockCache },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();
    service = module.get(VocabularyService);
  });

  it('cache hit → return 200 ngay', async () => {
    mockCache.get.mockResolvedValueOnce({ word: 'hello', meaning: 'xin chào' });
    const result = await service.suggestPost({ word: 'hello' }, { user: { idUser: 'u1' } });
    expect(result.status).toBe(200);
    expect(result.data?.meaning).toBe('xin chào');
    expect(mockRabbit.publishVocabSuggest).not.toHaveBeenCalled();
  });

  it('cache miss + no in-flight → enqueue + return 202 jobId', async () => {
    mockCache.get.mockResolvedValueOnce(null); // vocab:${word} miss
    mockCache.get.mockResolvedValueOnce(null); // vocab-job-active miss

    const result = await service.suggestPost({ word: 'world' }, { user: { idUser: 'u1' } });
    expect(result.status).toBe(202);
    expect(result.jobId).toBeDefined();
    expect(mockRabbit.publishVocabSuggest).toHaveBeenCalled();
  });

  it('cache miss + in-flight → return 202 với jobId cũ', async () => {
    mockCache.get.mockResolvedValueOnce(null); // vocab miss
    mockCache.get.mockResolvedValueOnce('existing-job-id'); // vocab-job-active hit

    const result = await service.suggestPost({ word: 'foo' }, { user: { idUser: 'u1' } });
    expect(result.status).toBe(202);
    expect(result.jobId).toBe('existing-job-id');
    expect(mockRabbit.publishVocabSuggest).not.toHaveBeenCalled();
  });

  it('GET suggest legacy: cache miss → 410 Gone', async () => {
    mockCache.get.mockResolvedValueOnce(null);
    await expect(service.suggest('freshword')).rejects.toThrow();
  });
});

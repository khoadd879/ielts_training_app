import { Test, TestingModule } from '@nestjs/testing';
import { StudyPlannerService } from './study-planner.service';
import { DatabaseService } from '../../database/database.service';
import { SystemConfigService } from '../system-config/system-config.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

describe('StudyPlannerService.getWeakSkills — cache', () => {
  let service: StudyPlannerService;
  const mockDb = {
    userTestResult: { findMany: jest.fn() },
  };
  const mockCache = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockCache.get.mockResolvedValue(null);
    mockCache.set.mockResolvedValue(undefined);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudyPlannerService,
        { provide: DatabaseService, useValue: mockDb },
        { provide: CACHE_MANAGER, useValue: mockCache },
        { provide: SystemConfigService, useValue: {} },
      ],
    }).compile();
    service = await module.resolve(StudyPlannerService);
  });

  it('3 lần liên tiếp trong cùng request → 1 DB call (requestCache)', async () => {
    mockDb.userTestResult.findMany.mockResolvedValueOnce([
      { bandScore: 6.0, test: { testType: 'READING' } },
    ]);

    await (service as any).getWeakSkills('user-1', 2);
    await (service as any).getWeakSkills('user-1', 2);
    await (service as any).getWeakSkills('user-1', 2);

    expect(mockDb.userTestResult.findMany).toHaveBeenCalledTimes(1);
  });

  it('cache miss → gọi DB + set Redis', async () => {
    mockDb.userTestResult.findMany.mockResolvedValueOnce([
      { bandScore: 6.0, test: { testType: 'READING' } },
    ]);

    await (service as any).getWeakSkills('user-1', 2);

    expect(mockDb.userTestResult.findMany).toHaveBeenCalledTimes(1);
    expect(mockCache.set).toHaveBeenCalledWith(
      'weak-skills:user-1:2',
      expect.any(Object),
      60,
    );
  });

  it('cache hit (Redis) → không gọi DB', async () => {
    mockCache.get.mockResolvedValueOnce({ input: ['READING'], output: [] });

    const result = await (service as any).getWeakSkills('user-1', 2);

    expect(mockDb.userTestResult.findMany).not.toHaveBeenCalled();
    expect(result.input).toEqual(['READING']);
  });

  it('sau khi cache.set, gọi cache.del → cache miss ở request mới', async () => {
    mockDb.userTestResult.findMany.mockResolvedValue([
      { bandScore: 6.0, test: { testType: 'READING' } },
      { bandScore: 6.0, test: { testType: 'READING' } },
    ]);

    // First request: miss → DB + set Redis
    await (service as any).getWeakSkills('user-1', 2);
    expect(mockCache.set).toHaveBeenCalled();

    // Simulate invalidation
    await (service as any).cache.del('weak-skills:user-1:2');

    // New request = new instance (Scope.REQUEST)
    const module2: TestingModule = await Test.createTestingModule({
      providers: [
        StudyPlannerService,
        { provide: DatabaseService, useValue: mockDb },
        { provide: CACHE_MANAGER, useValue: mockCache },
        { provide: SystemConfigService, useValue: {} },
      ],
    }).compile();
    mockDb.userTestResult.findMany.mockClear();
    mockCache.get.mockResolvedValueOnce(null); // Redis cache cleared

    const service2 = await module2.resolve(StudyPlannerService);
    await (service2 as any).getWeakSkills('user-1', 2);
    expect(mockDb.userTestResult.findMany).toHaveBeenCalledTimes(1);
  });
});
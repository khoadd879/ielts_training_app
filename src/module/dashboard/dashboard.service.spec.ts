import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { DatabaseService } from '../../database/database.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

describe('DashboardService.getSkillPerformance', () => {
  let service: DashboardService;
  let db: DatabaseService;

  const mockCache = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  };

  const mockDb = {
    $queryRaw: jest.fn(),
    user: {
      count: jest.fn().mockResolvedValue(1),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockCache.get.mockResolvedValue(null);
    mockCache.set.mockResolvedValue(undefined);
    mockDb.user.count.mockResolvedValue(1);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: DatabaseService, useValue: mockDb },
        { provide: CACHE_MANAGER, useValue: mockCache },
      ],
    }).compile();
    service = module.get(DashboardService);
    db = module.get(DatabaseService);
  });

  it('groupBy testType, trả về 4 skill với avg + count', async () => {
    mockDb.$queryRaw.mockResolvedValueOnce([
      { testType: 'LISTENING', avg: 7.0, count: BigInt(3) },
      { testType: 'READING', avg: 6.5, count: BigInt(2) },
    ]);

    const result = await service.getSkillPerformance();

    expect(result.LISTENING.total).toBe(7.0);
    expect(result.LISTENING.count).toBe(3);
    expect(result.READING.total).toBe(6.5);
    expect(result.READING.count).toBe(2);
    expect(result.WRITING.total).toBe(0);
    expect(result.WRITING.count).toBe(0);
  });

  it('hit cache thì không gọi DB', async () => {
    mockCache.get.mockResolvedValueOnce({
      LISTENING: { total: 7.0, count: 3 },
      READING: { total: 6.5, count: 2 },
      WRITING: { total: 0, count: 0 },
      SPEAKING: { total: 0, count: 0 },
    });

    const result = await service.getSkillPerformance();

    expect(result.LISTENING.total).toBe(7.0);
    expect(mockDb.$queryRaw).not.toHaveBeenCalled();
  });
});

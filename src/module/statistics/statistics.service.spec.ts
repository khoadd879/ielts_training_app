import { Test, TestingModule } from '@nestjs/testing';
import { StatisticsService } from './statistics.service';
import { DatabaseService } from '../../database/database.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

describe('StatisticsService.OverAllScore', () => {
  let service: StatisticsService;

  const mockCache = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
  };

  const mockDb = {
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockCache.get.mockResolvedValue(null);
    mockCache.set.mockResolvedValue(undefined);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatisticsService,
        { provide: DatabaseService, useValue: mockDb },
        { provide: CACHE_MANAGER, useValue: mockCache },
      ],
    }).compile();
    service = module.get(StatisticsService);
  });

  it('trả về 4 skill average, round 0.25→0.5, 0.75→1.0', async () => {
    mockDb.$queryRaw.mockResolvedValueOnce([
      { testType: 'READING', avg: 6.25 },
      { testType: 'LISTENING', avg: 7.75 },
    ]);

    const result = await service.OverAllScore('user-1');

    expect(result.READING).toBe(6.5);
    expect(result.LISTENING).toBe(8.0);
    expect(result.WRITING).toBe(0);
    expect(result.SPEAKING).toBe(0);
  });

  it('tổng = sum 4 skill', async () => {
    mockDb.$queryRaw.mockResolvedValueOnce([
      { testType: 'READING', avg: 6.0 },
      { testType: 'LISTENING', avg: 7.0 },
      { testType: 'WRITING', avg: 5.5 },
      { testType: 'SPEAKING', avg: 6.5 },
    ]);

    const result = await service.OverAllScore('user-1');

    expect(result.total).toBe(25.0);
  });
});

describe('StatisticsService.statistic', () => {
  let service: StatisticsService;

  const mockCache = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
  };

  const mockDb = {
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockCache.get.mockResolvedValue(null);
    mockCache.set.mockResolvedValue(undefined);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatisticsService,
        { provide: DatabaseService, useValue: mockDb },
        { provide: CACHE_MANAGER, useValue: mockCache },
      ],
    }).compile();
    service = module.get(StatisticsService);
  });

  it('groupBy date + testType, trả về statistics[] shape', async () => {
    mockDb.$queryRaw.mockResolvedValueOnce([
      { day: new Date('2026-07-01'), testType: 'READING', avg: 6.5, count: BigInt(2) },
      { day: new Date('2026-07-01'), testType: 'LISTENING', avg: 7.0, count: BigInt(1) },
      { day: new Date('2026-07-02'), testType: 'READING', avg: 6.0, count: BigInt(1) },
    ]);

    const result = await service.statistic('user-1');

    expect(result).toEqual([
      {
        date: '2026-07-01',
        READING: 6.5,
        LISTENING: 7.0,
        WRITING: 0,
        SPEAKING: 0,
      },
      {
        date: '2026-07-02',
        READING: 6.0,
        LISTENING: 0,
        WRITING: 0,
        SPEAKING: 0,
      },
    ]);
  });
});


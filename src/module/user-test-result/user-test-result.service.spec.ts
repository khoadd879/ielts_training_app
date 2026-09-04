import { Test, TestingModule } from '@nestjs/testing';
import { UserTestResultService } from './user-test-result.service';
import { DatabaseService } from '../../database/database.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { StreakService } from '../streak-service/streak-service.service';
import { UserWritingSubmissionService } from '../user-writing-submission/user-writing-submission.service';
import { UserSpeakingSubmissionService } from '../user-speaking-submission/user-speaking-submission.service';

describe('UserTestResultService.findAllTestResults', () => {
  let service: UserTestResultService;

  const mockCache = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  };

  const mockDb = {
    userTestResult: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockStreakService = {} as StreakService;
  const mockWritingService = {} as UserWritingSubmissionService;
  const mockSpeakingService = {} as UserSpeakingSubmissionService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserTestResultService,
        { provide: StreakService, useValue: mockStreakService },
        { provide: UserWritingSubmissionService, useValue: mockWritingService },
        { provide: UserSpeakingSubmissionService, useValue: mockSpeakingService },
        { provide: DatabaseService, useValue: mockDb },
        { provide: CACHE_MANAGER, useValue: mockCache },
      ],
    }).compile();
    service = module.get(UserTestResultService);
    mockDb.$transaction.mockImplementation(async (queries) => {
      return Promise.all(queries);
    });
  });

  it('pagination: trả về data + meta', async () => {
    mockDb.userTestResult.findMany.mockResolvedValueOnce([{ idTestResult: 'r1' }]);
    mockDb.userTestResult.count.mockResolvedValueOnce(45);

    const result = await service.findAllTestResults({ page: 2, limit: 10, skip: 10 } as any);

    expect(result.data).toEqual([{ idTestResult: 'r1' }]);
    expect(result.meta).toEqual({ page: 2, limit: 10, total: 45 });
    expect(mockDb.userTestResult.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 }),
    );
  });
});

describe('UserTestResultService.getBestBandByTest', () => {
  let service: UserTestResultService;
  const mockDb = {
    $queryRaw: jest.fn(),
    user: { findUnique: jest.fn() },
  };
  const mockCache = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
  };

  const mockStreakService = {} as StreakService;
  const mockWritingService = {} as UserWritingSubmissionService;
  const mockSpeakingService = {} as UserSpeakingSubmissionService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserTestResultService,
        { provide: StreakService, useValue: mockStreakService },
        { provide: UserWritingSubmissionService, useValue: mockWritingService },
        { provide: UserSpeakingSubmissionService, useValue: mockSpeakingService },
        { provide: DatabaseService, useValue: mockDb },
        { provide: CACHE_MANAGER, useValue: mockCache },
      ],
    }).compile();
    service = module.get(UserTestResultService);
  });

  it('groupBy idTest, trả về maxBand + lastFinishedAt per test', async () => {
    mockDb.user.findUnique.mockResolvedValueOnce({ idUser: 'user-1' });
    mockDb.$queryRaw.mockResolvedValueOnce([
      { idTest: 't1', maxBand: 7.5, lastFinishedAt: new Date('2026-07-01') },
      { idTest: 't2', maxBand: 6.0, lastFinishedAt: new Date('2026-06-15') },
    ]);

    const result = await service.getBestBandByTest('user-1');

    expect(result.data.t1.maxBand).toBe(7.5);
    expect(result.data.t2.maxBand).toBe(6.0);
  });
});

describe('UserTestResultService.getSkillStatus', () => {
  let service: UserTestResultService;
  const mockDb = { $queryRaw: jest.fn() };
  const mockCache = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
  };

  const mockStreakService = {} as StreakService;
  const mockWritingService = {} as UserWritingSubmissionService;
  const mockSpeakingService = {} as UserSpeakingSubmissionService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserTestResultService,
        { provide: StreakService, useValue: mockStreakService },
        { provide: UserWritingSubmissionService, useValue: mockWritingService },
        { provide: UserSpeakingSubmissionService, useValue: mockSpeakingService },
        { provide: DatabaseService, useValue: mockDb },
        { provide: CACHE_MANAGER, useValue: mockCache },
      ],
    }).compile();
    service = module.get(UserTestResultService);
  });

  it('DISTINCT ON testType, lấy row mới nhất per skill', async () => {
    mockDb.$queryRaw.mockResolvedValueOnce([
      { testType: 'READING', bandScore: 6.5, finishedAt: new Date('2026-07-01') },
      { testType: 'LISTENING', bandScore: 7.0, finishedAt: new Date('2026-06-20') },
    ]);

    const result = await service.getSkillStatus('user-1');

    expect(result.data.READING.band).toBe(6.5);
    expect(result.data.LISTENING.band).toBe(7.0);
    expect(result.data.WRITING.band).toBe(null);
  });
});

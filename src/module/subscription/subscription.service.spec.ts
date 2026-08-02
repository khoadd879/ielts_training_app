import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionService } from './subscription.service';
import { DatabaseService } from '../../database/database.service';

describe('SubscriptionService.useQuota — race', () => {
  let service: SubscriptionService;
  const mockDb = {
    userSubscription: {
      updateMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [SubscriptionService, { provide: DatabaseService, useValue: mockDb }],
    }).compile();
    service = module.get(SubscriptionService);
  });

  it('2 concurrent useQuota 3 từ quota 5/2 → 1 success, 1 rollback fail', async () => {
    mockDb.$transaction.mockImplementation(async (fn: any) => fn(mockDb));
    // Both updateMany succeed
    mockDb.userSubscription.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 });
    // First read: quota 5, used 2 (3 remaining, valid) → success
    // Second read: quota 5, used 5 (after both increments) — actually we want over
    // Simulate: 5 used > 5 quota → triggers rollback
    mockDb.userSubscription.findFirst
      .mockResolvedValueOnce({
        idSubscription: 'sub-1',
        creditsQuotaThisPeriod: 5,
        creditsUsedThisPeriod: 2,
      })
      .mockResolvedValueOnce({
        idSubscription: 'sub-1',
        creditsQuotaThisPeriod: 5,
        creditsUsedThisPeriod: 6,
      });
    mockDb.userSubscription.update.mockResolvedValue({});

    const p1 = service.useQuota('user-1', 3);
    const p2 = service.useQuota('user-1', 3);

    await expect(p1).resolves.toBeDefined();
    await expect(p2).rejects.toThrow();
    // Second call should have rolled back the increment
    expect(mockDb.userSubscription.update).toHaveBeenCalled();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { CreditsService } from './credits.service';
import { DatabaseService } from '../../database/database.service';

describe('CreditsService.deductCredit — race', () => {
  let service: CreditsService;
  const mockDb = {
    creditBalance: {
      updateMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    creditTransaction: { create: jest.fn() },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [CreditsService, { provide: DatabaseService, useValue: mockDb }],
    }).compile();
    service = module.get(CreditsService);
  });

  it('2 concurrent deductCredit 5 từ balance 10/5 → 1 success, 1 rollback fail', async () => {
    mockDb.$transaction.mockImplementation(async (fn: any) => fn(mockDb));
    // Both updateMany succeed (row exists); second one increments to 10 used
    mockDb.creditBalance.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 });
    // First read: 10 total, 5 used (still valid) → success
    // Second read: 10 total, 10 used (over by 0, actually NOT over)
    // We need the SECOND to go over: 10 total, 11 used
    mockDb.creditBalance.findUnique
      .mockResolvedValueOnce({ totalCredits: 10, usedCredits: 5 })
      .mockResolvedValueOnce({ totalCredits: 10, usedCredits: 11 });
    mockDb.creditBalance.update.mockResolvedValue({});
    mockDb.creditTransaction.create.mockResolvedValue({});

    const p1 = service.deductCredit({
      idUser: 'user-1',
      type: 'WRITING',
      submissionId: 'sub-1',
      creditsCost: 5,
    });
    const p2 = service.deductCredit({
      idUser: 'user-1',
      type: 'WRITING',
      submissionId: 'sub-2',
      creditsCost: 5,
    });

    await expect(p1).resolves.toBeDefined();
    await expect(p2).rejects.toThrow();
    // Second call should have rolled back the increment
    expect(mockDb.creditBalance.update).toHaveBeenCalled();
  });
});

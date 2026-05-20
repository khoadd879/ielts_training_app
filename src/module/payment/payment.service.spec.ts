import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PaymentService } from './payment.service';
import { DatabaseService } from 'src/database/database.service';

describe('PaymentService', () => {
  let service: PaymentService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: ConfigService, useValue: { get: () => '' } },
        { provide: DatabaseService, useValue: {} },
      ],
    }).compile();
    service = moduleRef.get(PaymentService);
  });

  describe('formatDate (GMT+7)', () => {
    it('formats UTC midnight to GMT+7 yyyyMMddHHmmss', () => {
      const utc = new Date('2026-05-20T00:00:00Z');
      // @ts-expect-error access private for test
      expect(service.formatDate(utc)).toBe('20260520070000');
    });

    it('handles day rollover (UTC 23:00 → GMT+7 06:00 next day)', () => {
      const utc = new Date('2026-05-19T23:00:00Z');
      // @ts-expect-error
      expect(service.formatDate(utc)).toBe('20260520060000');
    });

    it('handles month/year rollover at GMT+7 boundary', () => {
      // 2026-12-31 18:00 UTC = 2027-01-01 01:00 GMT+7
      const utc = new Date('2026-12-31T18:00:00Z');
      // @ts-expect-error
      expect(service.formatDate(utc)).toBe('20270101010000');
    });

    it('zero-pads single-digit components', () => {
      const utc = new Date('2026-01-05T02:03:04Z');
      // 02:03:04 UTC + 7h = 09:03:04 GMT+7
      // @ts-expect-error
      expect(service.formatDate(utc)).toBe('20260105090304');
    });
  });
});

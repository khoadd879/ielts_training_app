import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PaymentService } from './payment.service';
import { DatabaseService } from 'src/database/database.service';
import { CreditsService } from '../credits/credits.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { VnpayUtils } from './payment.utils';

const SECRET = 'TESTSECRET12345';

function makeDb() {
  return {
    paymentTransaction: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(async (fn: any) =>
      fn({
        paymentTransaction: {
          update: jest.fn().mockResolvedValue({}),
        },
      }),
    ),
  };
}

async function buildService(overrides: {
  db?: any;
  credits?: any;
  subscription?: any;
} = {}) {
  const db = overrides.db ?? makeDb();
  const credits =
    overrides.credits ?? {
      creditFromPayment: jest.fn().mockResolvedValue({ idTransaction: 'ct-1' }),
    };
  const subscription =
    overrides.subscription ?? {
      activateFromPayment: jest
        .fn()
        .mockResolvedValue({ idSubscription: 'sub-1' }),
    };

  const moduleRef = await Test.createTestingModule({
    providers: [
      PaymentService,
      {
        provide: ConfigService,
        useValue: {
          get: (k: string) => (k === 'VNPAY_HASH_SECRET' ? SECRET : ''),
        },
      },
      { provide: DatabaseService, useValue: db },
      { provide: CreditsService, useValue: credits },
      { provide: SubscriptionService, useValue: subscription },
    ],
  }).compile();

  return {
    service: moduleRef.get(PaymentService),
    db,
    credits,
    subscription,
  };
}

function signed(p: Record<string, string>) {
  return { ...p, vnp_SecureHash: VnpayUtils.generateSignature(p, SECRET) };
}

describe('PaymentService', () => {
  describe('formatDate (GMT+7)', () => {
    let service: PaymentService;
    beforeEach(async () => {
      ({ service } = await buildService());
    });

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
      const utc = new Date('2026-12-31T18:00:00Z');
      // @ts-expect-error
      expect(service.formatDate(utc)).toBe('20270101010000');
    });

    it('zero-pads single-digit components', () => {
      const utc = new Date('2026-01-05T02:03:04Z');
      // @ts-expect-error
      expect(service.formatDate(utc)).toBe('20260105090304');
    });
  });

  describe('handleVnpayIpn', () => {
    it('rejects bad signature with RspCode 97', async () => {
      const { service } = await buildService();
      const r = await service.handleVnpayIpn({
        vnp_TxnRef: 'X',
        vnp_SecureHash: 'BAD',
      });
      expect(r).toEqual({ RspCode: '97', Message: 'Invalid signature' });
    });

    it('returns 01 if order not found in DB', async () => {
      const { service, db } = await buildService();
      db.paymentTransaction.findUnique.mockResolvedValue(null);
      const r = await service.handleVnpayIpn(
        signed({
          vnp_TxnRef: 'X',
          vnp_Amount: '10000',
          vnp_ResponseCode: '00',
          vnp_TransactionStatus: '00',
        }),
      );
      expect(r.RspCode).toBe('01');
    });

    it('returns 04 on amount mismatch (and does NOT provision)', async () => {
      const { service, db, credits } = await buildService();
      db.paymentTransaction.findUnique.mockResolvedValue({
        idTransaction: 'p1',
        amount: 100,
        status: 'PENDING',
        packageType: 'CREDIT',
        idCreditPackage: 'pk1',
        idUser: 'u1',
      });
      const r = await service.handleVnpayIpn(
        signed({
          vnp_TxnRef: 'X',
          vnp_Amount: '99',
          vnp_ResponseCode: '00',
          vnp_TransactionStatus: '00',
        }),
      );
      expect(r.RspCode).toBe('04');
      expect(credits.creditFromPayment).not.toHaveBeenCalled();
    });

    it('is idempotent — second SUCCESS callback returns 02', async () => {
      const { service, db, credits } = await buildService();
      db.paymentTransaction.findUnique.mockResolvedValue({
        idTransaction: 'p1',
        amount: 100,
        status: 'SUCCESS',
        packageType: 'CREDIT',
        idCreditPackage: 'pk1',
        idUser: 'u1',
      });
      const r = await service.handleVnpayIpn(
        signed({
          vnp_TxnRef: 'X',
          vnp_Amount: '10000',
          vnp_ResponseCode: '00',
          vnp_TransactionStatus: '00',
        }),
      );
      expect(r.RspCode).toBe('02');
      expect(credits.creditFromPayment).not.toHaveBeenCalled();
    });

    it('credits user on first successful CREDIT payment', async () => {
      const { service, db, credits } = await buildService();
      db.paymentTransaction.findUnique.mockResolvedValue({
        idTransaction: 'p1',
        amount: 100,
        status: 'PENDING',
        packageType: 'CREDIT',
        idCreditPackage: 'pk1',
        idSubscriptionPackage: null,
        idUser: 'u1',
      });
      const r = await service.handleVnpayIpn(
        signed({
          vnp_TxnRef: 'X',
          vnp_Amount: '10000',
          vnp_ResponseCode: '00',
          vnp_TransactionStatus: '00',
        }),
      );
      expect(r.RspCode).toBe('00');
      expect(credits.creditFromPayment).toHaveBeenCalledTimes(1);
      expect(credits.creditFromPayment).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          idUser: 'u1',
          idCreditPackage: 'pk1',
          idTransaction: 'p1',
        }),
      );
    });

    it('activates subscription on first successful SUBSCRIPTION payment', async () => {
      const { service, db, subscription, credits } = await buildService();
      db.paymentTransaction.findUnique.mockResolvedValue({
        idTransaction: 'p2',
        amount: 200,
        status: 'PENDING',
        packageType: 'SUBSCRIPTION',
        idCreditPackage: null,
        idSubscriptionPackage: 'sp1',
        idUser: 'u1',
      });
      const r = await service.handleVnpayIpn(
        signed({
          vnp_TxnRef: 'X',
          vnp_Amount: '20000',
          vnp_ResponseCode: '00',
          vnp_TransactionStatus: '00',
        }),
      );
      expect(r.RspCode).toBe('00');
      expect(subscription.activateFromPayment).toHaveBeenCalledTimes(1);
      expect(credits.creditFromPayment).not.toHaveBeenCalled();
    });

    it('marks FAILED on non-00 response and does not provision', async () => {
      const { service, db, credits } = await buildService();
      db.paymentTransaction.findUnique.mockResolvedValue({
        idTransaction: 'p1',
        amount: 100,
        status: 'PENDING',
        packageType: 'CREDIT',
        idCreditPackage: 'pk1',
        idUser: 'u1',
      });
      const r = await service.handleVnpayIpn(
        signed({
          vnp_TxnRef: 'X',
          vnp_Amount: '10000',
          vnp_ResponseCode: '24',
          vnp_TransactionStatus: '02',
        }),
      );
      expect(r.RspCode).toBe('00');
      expect(credits.creditFromPayment).not.toHaveBeenCalled();
      expect(db.paymentTransaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'FAILED' }),
        }),
      );
    });

    it('returns 99 if provisioning throws inside the $transaction', async () => {
      const credits = {
        creditFromPayment: jest
          .fn()
          .mockRejectedValue(new Error('balance vanished')),
      };
      const { service, db } = await buildService({ credits });
      db.paymentTransaction.findUnique.mockResolvedValue({
        idTransaction: 'p1',
        amount: 100,
        status: 'PENDING',
        packageType: 'CREDIT',
        idCreditPackage: 'pk1',
        idUser: 'u1',
      });
      const r = await service.handleVnpayIpn(
        signed({
          vnp_TxnRef: 'X',
          vnp_Amount: '10000',
          vnp_ResponseCode: '00',
          vnp_TransactionStatus: '00',
        }),
      );
      expect(r.RspCode).toBe('99');
    });
  });

  describe('handleVnpayReturn', () => {
    it('returns invalid-signature for tampered query', async () => {
      const { service } = await buildService();
      const r = await service.handleVnpayReturn({
        vnp_TxnRef: 'X',
        vnp_SecureHash: 'BAD',
      });
      expect(r.success).toBe(false);
      expect(r.message).toBe('Invalid signature');
    });

    it('returns success on responseCode 00', async () => {
      const { service } = await buildService();
      const r = await service.handleVnpayReturn(
        signed({
          vnp_TxnRef: 'X',
          vnp_Amount: '10000',
          vnp_ResponseCode: '00',
        }),
      );
      expect(r.success).toBe(true);
      expect(r.amount).toBe(100);
    });

    it('returns failure with mapped message on responseCode 24 (cancel)', async () => {
      const { service } = await buildService();
      const r = await service.handleVnpayReturn(
        signed({
          vnp_TxnRef: 'X',
          vnp_Amount: '10000',
          vnp_ResponseCode: '24',
        }),
      );
      expect(r.success).toBe(false);
      expect(r.message).toMatch(/huy/i);
    });
  });
});

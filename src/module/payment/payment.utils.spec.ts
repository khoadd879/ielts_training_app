import { VnpayUtils } from './payment.utils';

describe('VnpayUtils', () => {
  const secret = 'TESTSECRET12345';

  describe('sortAndBuildQueryString', () => {
    it('sorts keys alphabetically and excludes vnp_SecureHash', () => {
      const qs = VnpayUtils.sortAndBuildQueryString({
        vnp_TxnRef: 'T1',
        vnp_Amount: 100,
        vnp_SecureHash: 'IGNORED',
      });
      expect(qs).toBe('vnp_Amount=100&vnp_TxnRef=T1');
    });

    it('skips empty/null/undefined values', () => {
      const qs = VnpayUtils.sortAndBuildQueryString({
        vnp_A: '',
        vnp_B: null as any,
        vnp_C: undefined as any,
        vnp_D: 'kept',
      });
      expect(qs).toBe('vnp_D=kept');
    });
  });

  describe('signature roundtrip', () => {
    it('verify passes for self-signed params', () => {
      const params: any = { vnp_TxnRef: 'T1', vnp_Amount: 100 };
      params.vnp_SecureHash = VnpayUtils.generateSignature(params, secret);
      expect(VnpayUtils.verifySignature(params, secret)).toBe(true);
    });

    it('verify fails when secret wrong', () => {
      const params: any = { vnp_TxnRef: 'T1', vnp_Amount: 100 };
      params.vnp_SecureHash = VnpayUtils.generateSignature(params, secret);
      expect(VnpayUtils.verifySignature(params, 'WRONG')).toBe(false);
    });

    it('verify fails when no hash present', () => {
      expect(VnpayUtils.verifySignature({ vnp_TxnRef: 'T1' }, secret)).toBe(
        false,
      );
    });

    it('verify fails when params tampered', () => {
      const params: any = { vnp_TxnRef: 'T1', vnp_Amount: 100 };
      params.vnp_SecureHash = VnpayUtils.generateSignature(params, secret);
      params.vnp_Amount = 999;
      expect(VnpayUtils.verifySignature(params, secret)).toBe(false);
    });
  });
});

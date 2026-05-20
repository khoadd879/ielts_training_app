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

    it('URL-encodes spaces and Vietnamese chars in values', () => {
      const qs = VnpayUtils.sortAndBuildQueryString({
        vnp_OrderInfo: 'Thanh toan don hang',
        vnp_TxnRef: 'T1',
      });
      expect(qs).toBe('vnp_OrderInfo=Thanh%20toan%20don%20hang&vnp_TxnRef=T1');
    });

    it('also strips vnp_SecureHashType', () => {
      const qs = VnpayUtils.sortAndBuildQueryString({
        vnp_TxnRef: 'T1',
        vnp_SecureHash: 'IGN',
        vnp_SecureHashType: 'SHA512',
      });
      expect(qs).toBe('vnp_TxnRef=T1');
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

    it('verify is case-insensitive on hash hex (VNPay sends lowercase)', () => {
      const params: any = { vnp_TxnRef: 'T1', vnp_Amount: 100 };
      const hash = VnpayUtils.generateSignature(params, secret);
      params.vnp_SecureHash = hash.toLowerCase();
      expect(VnpayUtils.verifySignature(params, secret)).toBe(true);
    });

    it('verify ignores vnp_SecureHashType field if VNPay sends it', () => {
      const params: any = { vnp_TxnRef: 'T1', vnp_Amount: 100 };
      params.vnp_SecureHash = VnpayUtils.generateSignature(params, secret);
      params.vnp_SecureHashType = 'SHA512';
      expect(VnpayUtils.verifySignature(params, secret)).toBe(true);
    });

    it('verify works for params with Vietnamese OrderInfo', () => {
      const params: any = {
        vnp_TxnRef: 'T1',
        vnp_Amount: 100,
        vnp_OrderInfo: 'Mua 10 credits goi Demo',
      };
      params.vnp_SecureHash = VnpayUtils.generateSignature(params, secret);
      expect(VnpayUtils.verifySignature(params, secret)).toBe(true);
    });
  });
});


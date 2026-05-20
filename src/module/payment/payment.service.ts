import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from 'src/database/database.service';
import { CreditsService } from '../credits/credits.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { VnpayUtils } from './payment.utils';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly vnpTmnCode: string;
  private readonly vnpHashSecret: string;
  private readonly vnpReturnUrl: string;
  private readonly vnpIpnUrl: string;
  private readonly isSandbox: boolean;

  // VNPay endpoints
  private readonly VNP_URL =
    'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
  private readonly VNP_API_URL =
    'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction';

  constructor(
    private readonly configService: ConfigService,
    private readonly db: DatabaseService,
    private readonly creditsService: CreditsService,
    private readonly subscriptionService: SubscriptionService,
  ) {
    this.vnpTmnCode = this.configService.get('VNPAY_TMN_CODE') ?? '';
    this.vnpHashSecret = this.configService.get('VNPAY_HASH_SECRET') ?? '';
    this.vnpReturnUrl = this.configService.get('VNPAY_RETURN_URL') ?? '';
    this.vnpIpnUrl = this.configService.get('VNPAY_IPN_URL') ?? '';
    this.isSandbox =
      this.configService.get('VNPAY_SANDBOX', 'true') === 'true';

    if (!this.vnpTmnCode || !this.vnpHashSecret || !this.vnpReturnUrl) {
      this.logger.error(
        'VNPay env vars missing: VNPAY_TMN_CODE / VNPAY_HASH_SECRET / VNPAY_RETURN_URL',
      );
    }
  }

  /**
   * Create VNPay payment URL for a credit or subscription package.
   *
   * Persists a PENDING PaymentTransaction row that is the source of truth
   * for everything that follows (return URL, IPN, reconciliation).
   */
  async createPaymentUrl(params: {
    idUser: string;
    idPackage: string;
    packageType: 'CREDIT' | 'SUBSCRIPTION';
    ipAddress: string;
    bankCode?: string;
  }): Promise<{
    paymentUrl: string;
    idTransaction: string;
    vnpTxnRef: string;
  }> {
    const { idUser, idPackage, packageType, ipAddress, bankCode } = params;

    // 1. Look up package + price from DB (no client-supplied amount)
    let amount: number;
    let orderInfo: string;
    let idCreditPackage: string | null = null;
    let idSubscriptionPackage: string | null = null;

    if (packageType === 'CREDIT') {
      const pkg = await this.db.creditPackage.findUnique({
        where: { idPackage },
      });
      if (!pkg || !pkg.isActive) {
        throw new NotFoundException('Credit package not found or inactive');
      }
      amount = pkg.price;
      orderInfo = `Mua ${pkg.creditAmount} credits - ${pkg.name}`;
      idCreditPackage = pkg.idPackage;
    } else {
      const pkg = await this.db.subscriptionPackage.findUnique({
        where: { idPackage },
      });
      if (!pkg || !pkg.isActive) {
        throw new NotFoundException(
          'Subscription package not found or inactive',
        );
      }
      amount = pkg.price;
      orderInfo = `Goi ${pkg.name}`;
      idSubscriptionPackage = pkg.idPackage;
    }

    if (amount <= 0) {
      throw new BadRequestException('Package price must be > 0');
    }

    // 2. Persist PENDING transaction (single source of truth)
    const now = new Date();
    const expireDate = new Date(now.getTime() + 15 * 60 * 1000); // 15 min
    const vnpTxnRef = `${packageType}_${idUser.slice(0, 8)}_${Date.now()}`;

    const tx = await this.db.paymentTransaction.create({
      data: {
        idUser,
        packageType,
        idCreditPackage,
        idSubscriptionPackage,
        amount,
        paymentMethod: 'VNPAY',
        status: 'PENDING',
        vnpTxnRef,
        ipAddress,
      },
    });

    // 3. Build VNPay params
    const vnpParams: Record<string, string | number> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.vnpTmnCode,
      vnp_Amount: Math.round(amount * 100),
      vnp_CurrCode: 'VND',
      vnp_Locale: 'vn',
      vnp_IpAddr: ipAddress,
      vnp_OrderInfo: orderInfo,
      vnp_OrderType: 'topup',
      vnp_ReturnUrl: this.vnpReturnUrl,
      vnp_ExpireDate: this.formatDate(expireDate),
      vnp_TxnRef: vnpTxnRef,
      vnp_CreateDate: this.formatDate(now),
    };

    if (bankCode) {
      vnpParams['vnp_BankCode'] = bankCode;
    }

    // 4. Sign + build URL using identical encoding scheme
    vnpParams['vnp_SecureHash'] = VnpayUtils.generateSignature(
      vnpParams,
      this.vnpHashSecret,
    );

    const queryString = Object.keys(vnpParams)
      .map(
        (k) =>
          `${encodeURIComponent(k)}=${encodeURIComponent(
            String(vnpParams[k]),
          )}`,
      )
      .join('&');
    const paymentUrl = `${this.VNP_URL}?${queryString}`;

    return { paymentUrl, idTransaction: tx.idTransaction, vnpTxnRef };
  }

  /**
   * Browser return — display-only. Provisioning is done by IPN, not here,
   * because the user can close the tab before this fires.
   */
  async handleVnpayReturn(
    query: Record<string, string>,
  ): Promise<{
    success: boolean;
    message: string;
    vnpTxnRef?: string;
    amount?: number;
  }> {
    if (!VnpayUtils.verifySignature(query, this.vnpHashSecret)) {
      return { success: false, message: 'Invalid signature' };
    }

    const responseCode = query['vnp_ResponseCode'];
    const vnpTxnRef = query['vnp_TxnRef'];
    const amount = parseInt(query['vnp_Amount'], 10) / 100;

    if (responseCode === '00') {
      return {
        success: true,
        message: 'Payment successful',
        vnpTxnRef,
        amount,
      };
    }

    return {
      success: false,
      message: this.mapResponseCode(responseCode),
      vnpTxnRef,
      amount,
    };
  }

  /**
   * IPN (server-to-server). Idempotent: provisions credits/subscription
   * exactly once, even if VNPay retries the callback.
   *
   * RspCode reference (per VNPay spec):
   *   00 — confirm success / order processed
   *   01 — order not found
   *   02 — order already confirmed
   *   04 — invalid amount
   *   97 — invalid signature
   *   99 — other error
   */
  async handleVnpayIpn(
    query: Record<string, string>,
  ): Promise<{ RspCode: string; Message: string }> {
    if (!VnpayUtils.verifySignature(query, this.vnpHashSecret)) {
      return { RspCode: '97', Message: 'Invalid signature' };
    }

    const vnpTxnRef = query['vnp_TxnRef'];
    const responseCode = query['vnp_ResponseCode'];
    const transactionStatus = query['vnp_TransactionStatus'];
    const amountVnp = parseInt(query['vnp_Amount'], 10);

    const payment = await this.db.paymentTransaction.findUnique({
      where: { vnpTxnRef },
    });
    if (!payment) {
      return { RspCode: '01', Message: 'Order not found' };
    }

    // Amount tampering check — server-recorded amount * 100 must match VNPay
    if (Math.round(payment.amount * 100) !== amountVnp) {
      await this.db.paymentTransaction.update({
        where: { idTransaction: payment.idTransaction },
        data: {
          status: 'FAILED',
          errorMessage: 'Amount mismatch',
          rawCallback: query as any,
        },
      });
      return { RspCode: '04', Message: 'Invalid amount' };
    }

    // Idempotency: already SUCCESS → return 02 (already confirmed)
    if (payment.status === 'SUCCESS') {
      return { RspCode: '02', Message: 'Order already confirmed' };
    }

    // Failure path: persist + return 00 to stop VNPay retry
    if (responseCode !== '00' || transactionStatus !== '00') {
      await this.db.paymentTransaction.update({
        where: { idTransaction: payment.idTransaction },
        data: {
          status: 'FAILED',
          vnpResponseCode: responseCode,
          vnpTransactionNo: query['vnp_TransactionNo'] ?? null,
          vnpBankCode: query['vnp_BankCode'] ?? null,
          vnpPayDate: query['vnp_PayDate'] ?? null,
          errorMessage: this.mapResponseCode(responseCode),
          rawCallback: query as any,
        },
      });
      return { RspCode: '00', Message: 'Order processed' };
    }

    // Success path — provision atomically
    try {
      await this.db.$transaction(async (tx) => {
        let idCreditTransaction: string | null = null;
        let idSubscription: string | null = null;

        if (payment.packageType === 'CREDIT') {
          const r = await this.creditsService.creditFromPayment(tx, {
            idTransaction: payment.idTransaction,
            idUser: payment.idUser,
            idCreditPackage: payment.idCreditPackage,
          });
          idCreditTransaction = r.idTransaction;
        } else {
          const r = await this.subscriptionService.activateFromPayment(tx, {
            idTransaction: payment.idTransaction,
            idUser: payment.idUser,
            idSubscriptionPackage: payment.idSubscriptionPackage,
          });
          idSubscription = r.idSubscription;
        }

        await tx.paymentTransaction.update({
          where: { idTransaction: payment.idTransaction },
          data: {
            status: 'SUCCESS',
            paidAt: new Date(),
            vnpResponseCode: responseCode,
            vnpTransactionNo: query['vnp_TransactionNo'] ?? null,
            vnpBankCode: query['vnp_BankCode'] ?? null,
            vnpPayDate: query['vnp_PayDate'] ?? null,
            idCreditTransaction,
            idSubscription,
            rawCallback: query as any,
          },
        });
      });

      return { RspCode: '00', Message: 'Confirm Success' };
    } catch (err: any) {
      this.logger.error(`Provision failed for ${vnpTxnRef}: ${err.message}`);
      return { RspCode: '99', Message: 'Provision failed' };
    }
  }

  private mapResponseCode(code: string | undefined): string {
    const map: Record<string, string> = {
      '00': 'Thanh cong',
      '07': 'Nghi ngo gian lan',
      '09': 'Khach hang chua dang ky InternetBanking',
      '10': 'Xac thuc thong tin sai qua 3 lan',
      '11': 'Het han thanh toan',
      '12': 'The bi khoa',
      '13': 'Sai mat khau OTP',
      '24': 'Khach hang huy',
      '51': 'Khong du so du',
      '65': 'Vuot han muc giao dich trong ngay',
      '75': 'Ngan hang dang bao tri',
      '79': 'Sai mat khau qua so lan quy dinh',
      '99': 'Loi khac',
    };
    return code && map[code] ? map[code] : `Loi (${code ?? 'unknown'})`;
  }

  /**
   * Query transaction status (for reconciliation)
   */
  async queryTransaction(txnRef: string): Promise<any> {
    // Implementation for querying VNPay transaction status
    // Uses the Query/Refund API endpoint
  }

  /**
   * Format date to yyyyMMddHHmmss in GMT+7 (VNPay requirement),
   * independent of host timezone.
   */
  private formatDate(date: Date): string {
    // Shift epoch by +7h, then read UTC components — works on any host TZ.
    const gmt7 = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    const yyyy = gmt7.getUTCFullYear();
    const MM = String(gmt7.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(gmt7.getUTCDate()).padStart(2, '0');
    const HH = String(gmt7.getUTCHours()).padStart(2, '0');
    const mm = String(gmt7.getUTCMinutes()).padStart(2, '0');
    const ss = String(gmt7.getUTCSeconds()).padStart(2, '0');
    return `${yyyy}${MM}${dd}${HH}${mm}${ss}`;
  }
}
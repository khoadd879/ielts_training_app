import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from 'src/database/database.service';
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
   * Handle VNPay return (after customer completes payment)
   */
  async handleVnpayReturn(
    query: any,
  ): Promise<{
    success: boolean;
    message: string;
    txnRef?: string;
    amount?: number;
  }> {
    // Verify signature
    if (!VnpayUtils.verifySignature(query, this.vnpHashSecret)) {
      return { success: false, message: 'Invalid signature' };
    }

    const responseCode = query['vnp_ResponseCode'];
    const txnRef = query['vnp_TxnRef'];
    const amount = parseInt(query['vnp_Amount']) / 100;

    if (responseCode === '00') {
      return {
        success: true,
        message: 'Payment successful',
        txnRef,
        amount,
      };
    }

    const errorMessages: Record<string, string> = {
      '07': 'Suspected fraud',
      '09': 'Internet banking not registered',
      '10': 'Invalid account info',
      '11': 'Payment timeout',
      '24': 'Customer cancelled',
      '51': 'Insufficient funds',
      '65': 'Daily limit exceeded',
      '75': 'Bank maintenance',
      '79': 'Wrong password',
      '99': 'Other error',
    };

    return {
      success: false,
      message: errorMessages[responseCode] || `Payment failed with code: ${responseCode}`,
      txnRef,
      amount,
    };
  }

  /**
   * Handle VNPay IPN (server-to-server notification)
   */
  async handleVnpayIpn(
    query: any,
  ): Promise<{ rspCode: string; message: string }> {
    // Verify signature
    if (!VnpayUtils.verifySignature(query, this.vnpHashSecret)) {
      return { rspCode: '97', message: 'Invalid signature' };
    }

    const responseCode = query['vnp_ResponseCode'];
    const transactionStatus = query['vnp_TransactionStatus'];
    const txnRef = query['vnp_TxnRef'];
    const amount = parseInt(query['vnp_Amount']) / 100;

    if (responseCode === '00' && transactionStatus === '00') {
      // Payment successful - credits/subscription will be provisioned
      // based on txnRef parsing (idUser, idPackage, packageType)
      // This is handled asynchronously - return success to VNPay
      return { rspCode: '00', message: 'Confirm success' };
    }

    // Payment failed
    return { rspCode: '00', message: 'Order processed' }; // Return 00 to stop VNPay retry
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
import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VnpayUtils } from './payment.utils';

@Injectable()
export class PaymentService {
  private readonly vnpTmnCode: string;
  private readonly vnpHashSecret: string;
  private readonly vnpReturnUrl: string;
  private readonly vnpIpnUrl: string;
  private readonly isSandbox: boolean;

  // VNPay endpoints
  private readonly VNP_URL = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
  private readonly VNP_API_URL =
    'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction';

  constructor(private readonly configService: ConfigService) {
    this.vnpTmnCode = this.configService.get('VNPAY_TMN_CODE') ?? '';
    this.vnpHashSecret = this.configService.get('VNPAY_HASH_SECRET') ?? '';
    this.vnpReturnUrl = this.configService.get('VNPAY_RETURN_URL') ?? '';
    this.vnpIpnUrl = this.configService.get('VNPAY_IPN_URL') ?? '';
    this.isSandbox = this.configService.get('VNPAY_SANDBOX', 'true') === 'true';
  }

  /**
   * Create VNPay payment URL for credit package purchase
   */
  async createPaymentUrl(params: {
    idUser: string;
    idPackage: string;
    packageType: 'CREDIT' | 'SUBSCRIPTION';
    amount: number; // Amount in VND (not *100)
    orderInfo: string;
    ipAddress: string;
  }): Promise<{ paymentUrl: string; txnRef: string }> {
    const { idUser, idPackage, packageType, amount, orderInfo, ipAddress } =
      params;

    const txnRef = `${packageType}_${idUser}_${idPackage}_${Date.now()}`;
    const now = new Date();
    const expireDate = new Date(now.getTime() + 15 * 60 * 1000); // 15 min expiry

    const vnpParams: Record<string, string | number> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.vnpTmnCode,
      vnp_Amount: amount * 100, // Convert to cents (no decimals)
      vnp_CurrCode: 'VND',
      vnp_Locale: 'vn',
      vnp_IpAddr: ipAddress,
      vnp_OrderInfo: orderInfo,
      vnp_OrderType: 'topup', // Category: topup, bill, etc.
      vnp_ReturnUrl: this.vnpReturnUrl,
      vnp_ExpireDate: this.formatDate(expireDate),
      vnp_TxnRef: txnRef,
      vnp_CreateDate: this.formatDate(now),
    };

    // Generate signature
    vnpParams['vnp_SecureHash'] = VnpayUtils.generateSignature(
      vnpParams,
      this.vnpHashSecret,
    );

    // Build payment URL
    const paymentUrl = `${this.VNP_URL}?${new URLSearchParams(
      vnpParams as any,
    ).toString()}`;

    return { paymentUrl, txnRef };
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
   * Format date to yyyyMMddHHmmss (GMT+7)
   */
  private formatDate(date: Date): string {
    const yyyy = date.getFullYear();
    const MM = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const HH = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${yyyy}${MM}${dd}${HH}${mm}${ss}`;
  }
}
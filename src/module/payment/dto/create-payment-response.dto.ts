import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentResponseDto {
  @ApiProperty({
    description: 'VNPay payment URL — frontend should navigate the browser to this URL via window.location.href',
    example:
      'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=5000000&...&vnp_SecureHash=ABCDEF...',
  })
  paymentUrl: string;

  @ApiProperty({
    description: 'Internal PaymentTransaction id (UUID). Use this to look up the order status later.',
    example: '9b6c5d40-7e3a-4b41-8d1e-7f0a2c3d4e5f',
  })
  idTransaction: string;

  @ApiProperty({
    description: "VNPay transaction reference echoed back in /return and /ipn callbacks (vnp_TxnRef)",
    example: 'CREDIT_9b6c5d40_1716185785000',
  })
  vnpTxnRef: string;
}

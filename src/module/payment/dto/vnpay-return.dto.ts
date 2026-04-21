import { IsString, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VnpayReturnDto {
  @ApiProperty()
  @IsString()
  vnp_TmnCode: string;

  @ApiProperty()
  @IsString()
  vnp_TxnRef: string;

  @ApiProperty()
  @IsString()
  vnp_Amount: string;

  @ApiProperty()
  @IsString()
  vnp_BankCode: string;

  @ApiProperty()
  @IsString()
  vnp_PayDate: string;

  @ApiProperty()
  @IsString()
  vnp_OrderInfo: string;

  @ApiProperty()
  @IsString()
  vnp_TransactionNo: string;

  @ApiProperty()
  @IsString()
  vnp_ResponseCode: string;

  @ApiProperty()
  @IsString()
  vnp_TransactionStatus: string;

  @ApiProperty()
  @IsString()
  vnp_SecureHash: string;
}
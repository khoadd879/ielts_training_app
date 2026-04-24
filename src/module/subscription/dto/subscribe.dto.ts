import { IsString, IsUUID, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubscribeDto {
  @ApiProperty()
  @IsUUID()
  idPackage: string;

  @ApiProperty({ description: 'Payment reference (from payment gateway)' })
  @IsString()
  paymentRef: string;

  @ApiProperty({ enum: ['MOMO', 'VNPAY', 'STRIPE', 'BANK_TRANSFER'] })
  @IsString()
  paymentMethod: string;

  @ApiProperty({ description: 'Auto-renew subscription', required: false })
  @IsOptional()
  autoRenew?: boolean;
}
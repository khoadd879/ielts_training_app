import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PurchaseCreditsDto {
  @ApiProperty()
  @IsUUID()
  idPackage: string;

  @ApiProperty({ description: 'Payment reference (from payment gateway)' })
  @IsString()
  paymentRef: string;
}
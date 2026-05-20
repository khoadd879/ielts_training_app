import { IsUUID, IsIn, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({ enum: ['CREDIT', 'SUBSCRIPTION'] })
  @IsIn(['CREDIT', 'SUBSCRIPTION'])
  packageType: 'CREDIT' | 'SUBSCRIPTION';

  @ApiProperty()
  @IsUUID()
  idPackage: string;

  @ApiPropertyOptional({
    description:
      'Optional VNPay bank/method code: VNPAYQR | VNBANK | INTCARD | NCB | VCB | ...',
  })
  @IsOptional()
  @IsString()
  bankCode?: string;
}

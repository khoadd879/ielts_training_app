import { IsString, IsUUID, IsIn, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({ enum: ['CREDIT', 'SUBSCRIPTION'] })
  @IsString()
  @IsIn(['CREDIT', 'SUBSCRIPTION'])
  packageType: 'CREDIT' | 'SUBSCRIPTION';

  @ApiProperty()
  @IsUUID()
  idPackage: string;

  @ApiProperty({ description: 'Client IP address' })
  @IsString()
  ipAddress: string;

  @ApiPropertyOptional({
    description:
      'Optional VNPay bank/method code: VNPAYQR | VNBANK | INTCARD | NCB | VCB | ...',
  })
  @IsOptional()
  @IsString()
  bankCode?: string;
}

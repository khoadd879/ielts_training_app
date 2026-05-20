import { IsString, IsUUID, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubscribeDto {
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

import { IsString, IsUUID, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
}
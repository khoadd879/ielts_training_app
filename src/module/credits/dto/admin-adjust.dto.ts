import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdminAdjustDto {
  @ApiProperty()
  @IsUUID()
  idUser: string;

  @ApiProperty({ description: 'Amount to adjust (positive for credit, negative for debit)' })
  @IsString()
  amount: string;

  @ApiProperty({ description: 'Reason for adjustment' })
  @IsString()
  reason: string;
}

import { IsNumber, IsPositive, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CommissionDto {
  @ApiProperty({ description: 'Commission for writing review in VND', example: 50000 })
  @IsNumber()
  @IsPositive()
  writing: number;

  @ApiProperty({ description: 'Commission for speaking review in VND', example: 40000 })
  @IsNumber()
  @IsPositive()
  speaking: number;
}
import { IsString, IsNumber, IsBoolean, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCreditPackageDto {
  @ApiProperty({ example: '10 AI Grading Credits' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Perfect for trying out AI grading', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(1)
  creditAmount: number;

  @ApiProperty({ example: 50000 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 'VND', required: false })
  @IsString()
  @IsOptional()
  priceUnit?: string;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ example: 1, required: false })
  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}
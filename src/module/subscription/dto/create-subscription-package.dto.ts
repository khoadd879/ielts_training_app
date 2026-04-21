import { IsString, IsNumber, IsBoolean, IsOptional, IsArray, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSubscriptionPackageDto {
  @ApiProperty({ example: 'Monthly Pro' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Access to all AI grading features', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'MONTHLY', enum: ['MONTHLY', 'ANNUAL'] })
  @IsString()
  billingCycle: string;

  @ApiProperty({ example: 199000 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 'VND', required: false })
  @IsString()
  @IsOptional()
  priceUnit?: string;

  @ApiProperty({ example: 30, description: '0 = unlimited' })
  @IsNumber()
  @Min(0)
  creditsQuota: number;

  @ApiProperty({ example: ['AI Writing', 'AI Speaking', 'Priority Queue'] })
  @IsArray()
  @IsOptional()
  features?: string[];

  @ApiProperty({ example: 'Popular', required: false })
  @IsString()
  @IsOptional()
  badge?: string;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiProperty({ example: 1, required: false })
  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}
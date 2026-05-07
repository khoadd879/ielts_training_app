import { IsNumber, IsArray, ArrayMinSize, IsString, Min, Max, ArrayMaxSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ModerationPolicyDto {
  @ApiProperty({ description: 'Score threshold for auto-approval (0-100)', example: 80 })
  @IsNumber()
  @Min(0)
  @Max(100)
  autoApproveThreshold: number;

  @ApiProperty({ description: 'Score threshold for auto-rejection (0-100)', example: 20 })
  @IsNumber()
  @Min(0)
  @Max(100)
  autoRejectThreshold: number;

  @ApiProperty({ description: 'Blocked words list', example: ['casino', 'betting'] })
  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  blockedWords: string[];

  @ApiProperty({ description: 'Review SLA in hours', example: 24 })
  @IsNumber()
  @Min(1)
  @Max(168)
  reviewSlaHours: number;
}
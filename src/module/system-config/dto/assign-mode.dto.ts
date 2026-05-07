import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AssignMode } from '@prisma/client';

export class AssignModeDto {
  @ApiProperty({ description: 'Assignment mode', enum: AssignMode, example: 'MANUAL' })
  @IsEnum(AssignMode, { message: 'Mode must be either AUTO or MANUAL' })
  mode: AssignMode;
}
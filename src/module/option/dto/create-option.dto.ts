import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';

export class CreateOptionDto {
  @IsNotEmpty()
  @ApiProperty({ example: '123' })
  idCauHoi: string;

  @IsOptional()
  @ApiProperty({ example: 'A' })
  option_label: string;

  @ApiProperty({ example: 'content' })
  @IsOptional()
  option_content: string;
}

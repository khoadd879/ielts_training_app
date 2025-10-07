import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { CreateOptionDto } from './create-option.dto';

export class CreateManyOptionsDto {
  @ApiProperty({
    type: [CreateOptionDto],
    description: 'Danh sách các option cần tạo',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOptionDto)
  options: CreateOptionDto[];
}

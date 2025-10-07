import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateOptionDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'uuid-cau-hoi', description: 'ID câu hỏi' })
  idCauHoi: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'A', description: 'Nhãn option' })
  option_label: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'Paris', description: 'Nội dung option' })
  option_content: string;
}

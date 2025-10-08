// Cài đặt nếu bạn chưa có: npm install class-validator class-transformer
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateGrammarCategoryDto {
  @IsString({ message: 'Tên phải là một chuỗi ký tự' })
  @IsNotEmpty({ message: 'Tên không được để trống' })
  @ApiProperty({ example: 'Present simple' })
  name: string;

  @IsString()
  @IsOptional() // Cho phép trường này có thể không được gửi lên
  @ApiProperty({ example: 'description' })
  description?: string;

  @IsUUID('4', { message: 'idUser phải là một UUID hợp lệ' }) // '4' là phiên bản UUID
  @IsOptional()
  @ApiProperty({ example: '123' })
  idUser?: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { Level, Prisma } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateGrammarDto {
  @IsString() // Thêm validator
  @IsNotEmpty()
  @ApiProperty({
    description: 'ID của danh mục ngữ pháp',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  idGrammarCategory: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Tiêu đề của bài học ngữ pháp',
    example: 'Thì Hiện tại Hoàn thành (Present Perfect)',
  })
  title: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Nội dung giải thích chi tiết bài học',
    example: 'Thì hiện tại hoàn thành dùng để diễn tả một hành động...',
  })
  explanation: string;

  @IsNotEmpty()
  @IsEnum(Level)
  @ApiProperty({
    description: 'Độ khó của bài học',
    enum: Level,
    example: Level.Mid,
  })
  level: Level;

  @IsOptional() // Thêm validator
  @ApiProperty({
    description: 'Mảng các đối tượng chứa lỗi sai thường gặp',
    type: 'array',
    example: [
      {
        mistake: 'I have seen him yesterday.',
        correction: 'I saw him yesterday.',
        explanation: "Dùng Quá khứ đơn với 'yesterday'.",
      },
    ],
    required: false,
  })
  commonMistakes?: Prisma.JsonArray;

  @IsOptional()
  @ApiProperty({
    description: 'Mảng các đối tượng chứa câu ví dụ',
    type: 'array',
    example: [
      {
        sentence: 'I have lived here for five years.',
        note: 'Hành động bắt đầu trong quá khứ, kéo dài đến hiện tại.',
      },
    ],
    required: false,
  })
  examples?: Prisma.JsonArray;
}

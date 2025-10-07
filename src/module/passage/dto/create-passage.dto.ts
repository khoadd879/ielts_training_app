import { IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePassageDto {
  @IsNotEmpty({ message: 'idPart must not be empty' })
  @ApiProperty({ example: 'uuid-part', description: 'ID của Part' })
  idPart: string;

  @IsNotEmpty({ message: 'title must not be empty' })
  @ApiProperty({ example: 'Passage Title', description: 'Tiêu đề Passage' })
  title: string;

  @IsNotEmpty({ message: 'content must not be empty' })
  @ApiProperty({
    example: 'This is the content...',
    description: 'Nội dung Passage',
  })
  content: string;

  @IsOptional()
  @ApiProperty({
    example: 'http://image.url/image.jpg',
    description: 'Ảnh minh họa',
    required: false,
  })
  image?: string;

  @IsOptional()
  @ApiProperty({
    example: 'Description text',
    description: 'Mô tả',
    required: false,
  })
  description?: string;

  @IsNotEmpty({ message: 'Number paragraph must not be empty' })
  @ApiProperty({ example: 5, description: 'Số đoạn văn' })
  numberParagraph: number;
}

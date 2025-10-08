import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsUUID,
  ValidateNested,
} from 'class-validator';

// DTO này định nghĩa cấu trúc của một câu trả lời duy nhất
class VocabularyAnswerDto {
  @IsUUID('4')
  @IsNotEmpty()
  idTuVung: string;

  @IsBoolean()
  @IsNotEmpty()
  isCorrect: boolean;
}

// DTO chính cho toàn bộ request body
export class SubmitReviewDto {
  @IsUUID('4')
  @IsNotEmpty()
  idUser: string;

  @IsArray()
  @ValidateNested({ each: true }) // Kiểm tra từng phần tử trong mảng
  @Type(() => VocabularyAnswerDto) // Chỉ định class cho mỗi phần tử
  answers: VocabularyAnswerDto[];
}

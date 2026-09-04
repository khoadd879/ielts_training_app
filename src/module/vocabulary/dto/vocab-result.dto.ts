import { ApiProperty } from '@nestjs/swagger';

export class VocabExerciseResultDto {
  @ApiProperty()
  vocabId: string;
  @ApiProperty()
  word: string;
  @ApiProperty()
  status: string;
  @ApiProperty()
  isCorrect: boolean;
}

export class VocabExerciseSummaryDto {
  @ApiProperty()
  total: number;
  @ApiProperty()
  correct: number;
  @ApiProperty()
  incorrect: number;
  @ApiProperty({ type: [VocabExerciseResultDto] })
  results: VocabExerciseResultDto[];
}

export class VocabPracticeSummaryDto {
  @ApiProperty()
  total: number;
  @ApiProperty()
  correct: number;
  @ApiProperty()
  incorrect: number;
}

export class VocabOptionSetDto {
  @ApiProperty()
  idVocab: string;
  @ApiProperty()
  word: string;
  @ApiProperty({ type: [String] })
  options: string[];
}

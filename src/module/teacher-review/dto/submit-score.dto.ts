import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

export class SubmitScoreDto {
  @ApiProperty({
    description: 'Teacher band score (0.0 - 9.0)',
    example: 7.5,
    minimum: 0,
    maximum: 9,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(9)
  bandScore: number;

  @ApiProperty({
    description: 'Detailed teacher feedback in JSON format',
    example: {
      taskResponse: 'Good development of ideas with relevant examples',
      coherenceAndCohesion:
        'Well-organized essay with clear paragraph structure',
      lexicalResource: 'Good vocabulary range with some advanced words',
      grammaticalRangeAndAccuracy:
        'Mostly accurate grammar with complex sentence structures',
      generalFeedback:
        'Overall a well-written essay demonstrating solid English skills',
      detailedCorrections: [],
    },
  })
  @IsNotEmpty()
  @IsObject()
  feedback: Record<string, any>;
}

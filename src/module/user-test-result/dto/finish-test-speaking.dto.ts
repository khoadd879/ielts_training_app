import { IsArray, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SpeakingPartType } from '@prisma/client';

class SpeakingSubmissionItem {
    @ApiProperty({
        description: 'Part của bài Speaking (PART1, PART2, hoặc PART3)',
        enum: SpeakingPartType,
        example: 'PART1',
    })
    @IsEnum(SpeakingPartType)
    part: SpeakingPartType;

    @ApiPropertyOptional({
        description: 'ID của Speaking Task (nếu có)',
        example: 'uuid-speaking-task-1',
    })
    @IsOptional()
    @IsString()
    idSpeakingTask?: string;
}

export class FinishTestSpeakingDto {
    @ApiPropertyOptional({
        description: 'Danh sách thông tin các bài Speaking submissions (tối đa 3 parts)',
        type: [SpeakingSubmissionItem],
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SpeakingSubmissionItem)
    speakingSubmissions?: SpeakingSubmissionItem[];
}

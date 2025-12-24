import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FinishTestSpeakingDto {
    @ApiPropertyOptional({
        description: 'ID của Speaking Task (nếu không có sẽ lấy từ test)',
        example: 'uuid-speaking-task-1',
    })
    @IsOptional()
    @IsString()
    idSpeakingTask?: string;
}

import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, Max, Min } from "class-validator";

export class CreateTargetExam{
    @ApiProperty({example: '2025-11-11'})
    @IsOptional()
    @IsDateString()
    targetExamDate?: string

    @ApiProperty({example: 5.0})
    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    @Min(0)
    @Max(9.0)
    targetBandScore?: number
}
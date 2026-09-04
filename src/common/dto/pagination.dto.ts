import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}

export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
}

export function buildPaginatedMeta(
  page: number,
  limit: number,
  total: number,
): PaginatedMeta {
  return { page, limit, total };
}

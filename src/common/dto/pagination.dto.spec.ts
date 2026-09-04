import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PaginationDto, buildPaginatedMeta } from './pagination.dto';

describe('PaginationDto', () => {
  it('defaults page=1, limit=20 khi không truyền', async () => {
    const dto = plainToInstance(PaginationDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(20);
    expect(dto.skip).toBe(0);
  });

  it('skip = (page - 1) * limit', () => {
    const dto = plainToInstance(PaginationDto, { page: 3, limit: 10 });
    expect(dto.skip).toBe(20);
  });

  it('reject limit > 100', async () => {
    const dto = plainToInstance(PaginationDto, { page: 1, limit: 101 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('limit');
  });

  it('reject limit < 1', async () => {
    const dto = plainToInstance(PaginationDto, { page: 1, limit: 0 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('coerce string → number từ query params', () => {
    const dto = plainToInstance(PaginationDto, { page: '2', limit: '15' });
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(15);
  });
});

describe('buildPaginatedMeta', () => {
  it('build meta đúng shape', () => {
    expect(buildPaginatedMeta(2, 10, 45)).toEqual({ page: 2, limit: 10, total: 45 });
  });
});

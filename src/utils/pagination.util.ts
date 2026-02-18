import { PAGINATION, type PaginatedResult } from '../types/pagination';

export function parsePagination(query: { page?: string; limit?: string }): {
  page: number;
  limit: number;
  skip: number;
} {
  const page = Math.max(1, parseInt(query.page ?? '', 10) || PAGINATION.defaultPage);
  const rawLimit = parseInt(query.limit ?? '', 10) || PAGINATION.defaultLimit;
  const limit = Math.min(Math.max(1, rawLimit), PAGINATION.maxLimit);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function toPaginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

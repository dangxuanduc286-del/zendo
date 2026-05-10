export interface PaginationInput {
  page?: number | string | null;
  pageSize?: number | string | null;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export function getPaginationParams(input: PaginationInput = {}): PaginationParams {
  const rawPage = Number(input.page ?? DEFAULT_PAGE);
  const rawPageSize = Number(input.pageSize ?? DEFAULT_PAGE_SIZE);

  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : DEFAULT_PAGE;
  const pageSize =
    Number.isFinite(rawPageSize) && rawPageSize > 0
      ? Math.min(Math.floor(rawPageSize), MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

export function buildPaginationMeta(totalItems: number, params: PaginationParams): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(totalItems / params.pageSize));
  const currentPage = Math.min(params.page, totalPages);

  return {
    page: currentPage,
    pageSize: params.pageSize,
    totalItems,
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  };
}

export type ApiResponse<T> = {
  readonly payload: T;
  readonly code?: string;
  readonly message?: string;
};

export type PageResponse<T> = {
  readonly items: readonly T[];
  readonly page: number;
  readonly size: number;
  readonly totalCount: number;
  readonly totalPages: number;
};

export type PaginationVariables = {
  readonly page: number;
  readonly size: number;
};

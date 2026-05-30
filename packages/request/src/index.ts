export type Pager = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  nextCursor?: string | null;
  hasNextPage?: boolean;
};

export type SuccessBody<T> = {
  code: "OK";
  message: "success";
  data: T;
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  nextCursor?: string | null;
  hasNextPage?: boolean;
  traceId: string;
};

export type ErrorBody = {
  message: string;
  code: string;
  traceId: string;
};

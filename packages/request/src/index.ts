// 偏移分页元数据：页码 + 总量。游标字段为兼容历史响应保留。
export type Pager = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  nextCursor?: string | null;
  hasNextPage?: boolean;
};

// 双向游标分页元数据。游标 token 由服务端签发、对客户端不透明，客户端只负责原样回传。
// 没有页码 / 总页数概念；total 可选（游标分页通常不强制 COUNT）。
export type CursorPager = {
  limit: number;
  total?: number;
  nextCursor: string | null;
  prevCursor: string | null;
  hasNextPage: boolean;
  hasPrevPage: boolean;
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
  prevCursor?: string | null;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
  traceId: string;
};

export type ErrorBody = {
  message: string;
  code: string;
  traceId: string;
};

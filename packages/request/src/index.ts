export type Pager = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type SuccessBody<T> = {
  data: T;
  pager?: Pager;
};

export type ErrorBody = {
  message: string;
};

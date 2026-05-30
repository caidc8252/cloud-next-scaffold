"use client";

import { useCallback, useState } from "react";

// 服务端签发的一页游标元数据。客户端只读、原样持有，不解析也不构造游标。
export type CursorPageMeta = {
  nextCursor?: string | null;
  prevCursor?: string | null;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
};

export type CursorDirection = "next" | "prev";

// 一次翻页请求：回传给服务端的不透明游标（首页为 null）+ 显式方向 + 展示用页码。
export type CursorPageRequest = {
  cursor: string | null;
  direction: CursorDirection;
  page: number;
};

export type CursorPagination = {
  page: number;
  canPrev: boolean;
  canNext: boolean;
  // 回到首页：清空游标，从第一条记录查起。
  reset: () => CursorPageRequest;
  // 用服务端给的 nextCursor 向后翻；没有下一页时返回 null。
  toNext: () => CursorPageRequest | null;
  // 用服务端给的 prevCursor 向前翻；没有上一页时返回 null。
  toPrev: () => CursorPageRequest | null;
  // 一页加载成功后调用，吸收服务端返回的游标和翻页标志。
  sync: (meta: CursorPageMeta, loadedPage: number) => void;
};

// 双向游标分页的客户端状态机：只持有当前页由服务端签发的游标 + 一个展示用页码，
// 不缓存历史游标，也不从行数据里推导游标。翻页方向交给服务端编码在游标 token 内。
export function useCursorPagination(): CursorPagination {
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<CursorPageMeta>({});

  const reset = useCallback((): CursorPageRequest => {
    setMeta({});
    setPage(1);
    return { cursor: null, direction: "next", page: 1 };
  }, []);

  const toNext = useCallback((): CursorPageRequest | null => {
    if (!meta.hasNextPage || !meta.nextCursor) return null;
    return { cursor: meta.nextCursor, direction: "next", page: page + 1 };
  }, [meta.hasNextPage, meta.nextCursor, page]);

  const toPrev = useCallback((): CursorPageRequest | null => {
    if (!meta.hasPrevPage || !meta.prevCursor) return null;
    return { cursor: meta.prevCursor, direction: "prev", page: page - 1 };
  }, [meta.hasPrevPage, meta.prevCursor, page]);

  const sync = useCallback((next: CursorPageMeta, loadedPage: number) => {
    setMeta(next);
    setPage(loadedPage);
  }, []);

  return {
    page,
    canPrev: Boolean(meta.hasPrevPage),
    canNext: Boolean(meta.hasNextPage),
    reset,
    toNext,
    toPrev,
    sync,
  };
}

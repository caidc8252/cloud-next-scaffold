import "server-only";

import type { CursorPager } from "./index.ts";

export type CursorDirection = "next" | "prev";

// 不透明的服务端游标载荷，只编码边界行的唯一键。翻页方向由客户端显式传 direction，
// 不编进 token。客户端把 token 当作字符串原样回传，不解析、不拼接、不从行数据推导。
export type CursorPayload = {
  // 边界行的唯一键，即 Prisma cursor 定位用的目标值。
  id: number | string;
};

// 把锚点 id 编码成不透明 token（base64url JSON）。
export function encodeCursor(id: number | string): string {
  return Buffer.from(JSON.stringify({ id } satisfies CursorPayload), "utf8").toString("base64url");
}

// 解析客户端回传的 token；非法或缺省时返回 null，调用方据此当作首页处理。
export function decodeCursor(token: string | null | undefined): CursorPayload | null {
  if (!token) return null;
  try {
    const raw: unknown = JSON.parse(Buffer.from(token, "base64url").toString("utf8"));
    if (typeof raw !== "object" || raw === null) return null;
    const { id } = raw as Record<string, unknown>;
    if (typeof id !== "number" && typeof id !== "string") return null;
    return { id };
  } catch {
    return null;
  }
}

// 翻页方向；缺省按 "next"（首页也走这里）。
function parseDirection(value: string | null | undefined): CursorDirection {
  return value === "prev" ? "prev" : "next";
}

// 入站游标解析结果：解码后的游标 + 本次应使用的排序方向。
export type CursorQuery = {
  // 解码后的入站游标；首页为 null。
  cursor: CursorPayload | null;
  // 客户端显式传入的翻页方向；缺省按 "next"。
  direction: CursorDirection;
  // 向后翻用升序，向前翻用降序（结果展示前会翻回升序）。
  sortOrder: "asc" | "desc";
};

// 从请求里的不透明 token + direction 读出查询计划：
// sortOrder 用于 orderBy，cursor.id 用于 Prisma 的 cursor 定位。
export function readCursorQuery(
  token: string | null | undefined,
  direction: string | null | undefined,
): CursorQuery {
  const dir = parseDirection(direction);
  return {
    cursor: decodeCursor(token),
    direction: dir,
    sortOrder: dir === "prev" ? "desc" : "asc",
  };
}

// 把「多取一条」的查询结果（limit + 1 行，按 sortOrder 排序）整理成展示行 + 双向游标。
// 多取的那一条用于探测该方向是否还有下一页。
export function buildCursorPage<TRow>(params: {
  rows: TRow[];
  limit: number;
  query: CursorQuery;
  idOf: (row: TRow) => number | string;
  total?: number;
}): { items: TRow[]; pager: CursorPager } {
  const { rows, limit, query, idOf, total } = params;
  const hasMore = rows.length > limit;
  const sliced = hasMore ? rows.slice(0, limit) : rows;
  // 向前翻是降序查回来的，翻回升序再展示，保证顺序稳定。
  const items = query.direction === "prev" ? [...sliced].reverse() : sliced;

  const first = items[0];
  const last = items[items.length - 1];
  const hadCursor = query.cursor !== null;

  // next / 首页：多取的一条探测的是「下一页」；带游标进来即说明存在上一页。
  // prev：必然是从更靠后的页回来的（下一页一定存在），多取的一条探测的是「上一页」。
  const hasNextPage = query.direction === "prev" ? hadCursor : hasMore;
  const hasPrevPage = query.direction === "prev" ? hasMore : hadCursor;

  return {
    items,
    pager: {
      limit,
      total,
      hasNextPage,
      hasPrevPage,
      nextCursor: hasNextPage && last !== undefined ? encodeCursor(idOf(last)) : null,
      prevCursor: hasPrevPage && first !== undefined ? encodeCursor(idOf(first)) : null,
    },
  };
}

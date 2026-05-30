import { describe, expect, it } from "vitest";
import {
  buildCursorPage,
  decodeCursor,
  encodeCursor,
  readCursorQuery,
  type CursorQuery,
} from "./server.ts";

type Row = { id: number };

const idOf = (row: Row) => row.id;

describe("cursor codec", () => {
  it("round-trips an opaque token carrying only the anchor id", () => {
    const token = encodeCursor(42);
    expect(typeof token).toBe("string");
    expect(decodeCursor(token)).toEqual({ id: 42 });
  });

  it("returns null for empty, malformed, or shape-invalid tokens", () => {
    expect(decodeCursor(null)).toBeNull();
    expect(decodeCursor(undefined)).toBeNull();
    expect(decodeCursor("")).toBeNull();
    expect(decodeCursor("not-base64-json")).toBeNull();
    expect(decodeCursor(Buffer.from('{"foo":1}', "utf8").toString("base64url"))).toBeNull();
    expect(decodeCursor(Buffer.from('{"id":[1,2]}', "utf8").toString("base64url"))).toBeNull();
  });
});

describe("readCursorQuery", () => {
  it("treats a missing token/direction as the first forward page", () => {
    expect(readCursorQuery(null, null)).toEqual({
      cursor: null,
      direction: "next",
      sortOrder: "asc",
    });
  });

  it("uses the explicit direction param to pick sort order", () => {
    const token = encodeCursor(6);
    expect(readCursorQuery(token, "prev")).toEqual({
      cursor: { id: 6 },
      direction: "prev",
      sortOrder: "desc",
    });
    expect(readCursorQuery(token, "next")).toEqual({
      cursor: { id: 6 },
      direction: "next",
      sortOrder: "asc",
    });
  });
});

describe("buildCursorPage", () => {
  const nextQuery = (cursorId: number | null): CursorQuery => ({
    cursor: cursorId === null ? null : { id: cursorId },
    direction: "next",
    sortOrder: "asc",
  });

  it("first page with more rows: next only, opaque cursor, no prev", () => {
    // limit 5, fetched 6 (the probe row) ascending.
    const rows: Row[] = [1, 2, 3, 4, 5, 6].map((id) => ({ id }));
    const { items, pager } = buildCursorPage({ rows, limit: 5, query: nextQuery(null), idOf });

    expect(items.map(idOf)).toEqual([1, 2, 3, 4, 5]);
    expect(pager.hasNextPage).toBe(true);
    expect(pager.hasPrevPage).toBe(false);
    expect(pager.prevCursor).toBeNull();
    expect(decodeCursor(pager.nextCursor)).toEqual({ id: 5 });
  });

  it("first page that exactly fits: no next page", () => {
    const rows: Row[] = [1, 2, 3].map((id) => ({ id }));
    const { items, pager } = buildCursorPage({ rows, limit: 5, query: nextQuery(null), idOf });

    expect(items.map(idOf)).toEqual([1, 2, 3]);
    expect(pager.hasNextPage).toBe(false);
    expect(pager.nextCursor).toBeNull();
  });

  it("forward page from a cursor: prev exists because we arrived via a cursor", () => {
    const rows: Row[] = [6, 7, 8, 9, 10, 11].map((id) => ({ id }));
    const { items, pager } = buildCursorPage({ rows, limit: 5, query: nextQuery(5), idOf });

    expect(items.map(idOf)).toEqual([6, 7, 8, 9, 10]);
    expect(pager.hasNextPage).toBe(true);
    expect(pager.hasPrevPage).toBe(true);
    expect(decodeCursor(pager.prevCursor)).toEqual({ id: 6 });
    expect(decodeCursor(pager.nextCursor)).toEqual({ id: 10 });
  });

  it("backward page: reverses to ascending, next always exists, prev from probe", () => {
    // prev query returns rows before the anchor, descending; probe row included.
    const rows: Row[] = [10, 9, 8, 7, 6, 5].map((id) => ({ id }));
    const query: CursorQuery = {
      cursor: { id: 11 },
      direction: "prev",
      sortOrder: "desc",
    };
    const { items, pager } = buildCursorPage({ rows, limit: 5, query, idOf });

    expect(items.map(idOf)).toEqual([6, 7, 8, 9, 10]);
    expect(pager.hasNextPage).toBe(true);
    expect(pager.hasPrevPage).toBe(true);
    expect(decodeCursor(pager.prevCursor)).toEqual({ id: 6 });
    expect(decodeCursor(pager.nextCursor)).toEqual({ id: 10 });
  });

  it("backward page landing on the very first page: no further prev", () => {
    const rows: Row[] = [5, 4, 3, 2, 1].map((id) => ({ id }));
    const query: CursorQuery = {
      cursor: { id: 6 },
      direction: "prev",
      sortOrder: "desc",
    };
    const { items, pager } = buildCursorPage({ rows, limit: 5, query, idOf });

    expect(items.map(idOf)).toEqual([1, 2, 3, 4, 5]);
    expect(pager.hasPrevPage).toBe(false);
    expect(pager.prevCursor).toBeNull();
    expect(pager.hasNextPage).toBe(true);
  });
});

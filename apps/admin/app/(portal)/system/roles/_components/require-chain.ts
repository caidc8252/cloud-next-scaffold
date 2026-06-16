import type { PermissionItem } from "@/app/(portal)/system/_shared/types";

// 同菜单内的 require 链工具：授权时连带前置、撤销时连带依赖、锁定被依赖的前置。
// 纯函数，便于单测；UI（role-editor）据此联动勾选与禁用。

function requireOf(items: PermissionItem[]): Map<string, string | null> {
  return new Map(items.map((i) => [i.code, i.require]));
}

function dependentsOf(items: PermissionItem[]): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const i of items) {
    if (i.require == null) continue;
    m.set(i.require, [...(m.get(i.require) ?? []), i.code]);
  }
  return m;
}

/** grant=true：加 code 及其全部前置；grant=false：去 code 及其全部（传递）依赖。返回新 granted 列表。 */
export function applyGrant(
  items: PermissionItem[],
  granted: string[],
  code: string,
  grant: boolean,
): string[] {
  const set = new Set(granted);
  if (grant) {
    const req = requireOf(items);
    let cur: string | null = code;
    while (cur != null) {
      set.add(cur);
      cur = req.get(cur) ?? null;
    }
  } else {
    const deps = dependentsOf(items);
    const stack = [code];
    while (stack.length) {
      const c = stack.pop()!;
      if (!set.has(c)) continue;
      set.delete(c);
      for (const d of deps.get(c) ?? []) stack.push(d);
    }
  }
  return [...set];
}

/** 锁定集：被某个已授予后代「require」到的前置（不可单独取消）。 */
export function computeLocked(items: PermissionItem[], granted: string[]): Set<string> {
  const req = requireOf(items);
  const locked = new Set<string>();
  for (const code of granted) {
    let cur = req.get(code) ?? null;
    while (cur != null) {
      locked.add(cur);
      cur = req.get(cur) ?? null;
    }
  }
  return locked;
}

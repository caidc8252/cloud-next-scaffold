import { PERMISSION_CATALOG, MENU_TREE } from "./mock";
import type { PermissionEntry } from "./types";

export function relTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 30 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function fmtDateTime(iso: string | number): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const HUES = [210, 260, 330, 30, 150, 180];

export function hueFor(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return HUES[Math.abs(hash) % HUES.length];
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export type PermissionGroup = {
  menuId: string;
  menuTitle: string;
  items: PermissionEntry[];
};

export function permissionGroupsForContract(contractDefineCode: string): PermissionGroup[] {
  const menus = MENU_TREE.filter((m) => m.contractDefineCode === contractDefineCode);
  if (menus.length === 0) return [];

  const groups: PermissionGroup[] = [];

  for (const menu of menus) {
    const items = PERMISSION_CATALOG.filter((p) => p.menuId === menu.id);
    if (items.length > 0) {
      groups.push({ menuId: menu.id, menuTitle: menu.title, items });
    }
  }

  return groups;
}

export function permAppliesToContract(permCode: string, contractDefineCode: string): boolean {
  const perm = PERMISSION_CATALOG.find((p) => p.code === permCode);
  if (!perm) return false;
  const menu = MENU_TREE.find((m) => m.id === perm.menuId);
  return menu?.contractDefineCode === contractDefineCode;
}

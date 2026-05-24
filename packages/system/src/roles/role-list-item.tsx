"use client";

import { Shield } from "lucide-react";
import { Badge, cn } from "@cloud/ui";
import type { Role } from "../types";

type RoleListItemProps = {
  role: Role;
  active: boolean;
  onClick: () => void;
};

export function RoleListItem({ role, active, onClick }: RoleListItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 w-full px-3.5 py-3 text-left transition-colors border-b border-line-subtle last:border-b-0 hover:bg-surface-hover"
      style={active ? { background: "var(--color-primary-50)" } : undefined}
    >
      <div className="rounded-lg shrink-0"
        style={{ width: 30, height: 30, background: active ? "var(--color-primary-700)" : "var(--color-surface-3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Shield size={16} style={{ color: active ? "#fff" : "var(--color-content-secondary)" }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold truncate text-content-primary" style={{ fontSize: 13.5 }}>{role.name}</span>
          {role.builtin && <Badge variant="outline" className="shrink-0">SYSTEM</Badge>}
        </div>
        <div className="mt-0.5 text-content-tertiary" style={{ fontSize: 11.5 }}>{role.permissions.length} permissions</div>
      </div>
    </button>
  );
}

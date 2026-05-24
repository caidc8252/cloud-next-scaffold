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
      className={cn(
        "flex items-center gap-2.5 w-full px-3 py-2.5 rounded-md text-left transition-colors",
        active ? "bg-surface-2 shadow-1" : "hover:bg-surface-hover",
      )}
    >
      <Shield size={14} className="text-content-tertiary shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-content-primary truncate">{role.name}</span>
          {role.builtin && <Badge variant="outline" className="shrink-0">SYSTEM</Badge>}
        </div>
        <div className="text-xs text-content-tertiary mt-0.5">{role.permissions.length} permissions</div>
      </div>
    </button>
  );
}

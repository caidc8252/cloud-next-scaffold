"use client";

import { Shield } from "lucide-react";
import { Badge, Button, cn } from "@cloud/ui";
import type { Role } from "@/app/(dashboard)/system/_shared/types";

type RoleListItemProps = {
  role: Role;
  active: boolean;
  onClick: () => void;
};

export function RoleListItem({ role, active, onClick }: RoleListItemProps) {
  return (
    <Button
      variant="ghost"
      size="auto"
      block
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "justify-start gap-3 px-4 py-3 rounded-none border-b border-line-subtle last:border-b-0",
        active && "bg-primary-50 hover:bg-primary-50",
      )}
    >
      <div
        className={cn(
          "rounded-lg shrink-0 flex size-8 items-center justify-center",
          active ? "bg-primary-700 text-content-inverse" : "bg-surface-3 text-content-secondary",
        )}
      >
        <Shield size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-md font-semibold text-content-primary">{role.name}</span>
          {role.builtin && <Badge tone="neutral" className="shrink-0">SYSTEM</Badge>}
        </div>
        <div className="mt-0.5 text-xs text-content-tertiary text-left">{role.permissions.length} permissions</div>
      </div>
    </Button>
  );
}

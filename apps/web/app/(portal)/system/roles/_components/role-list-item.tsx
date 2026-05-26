"use client";

import { Shield } from "lucide-react";
import { Badge, ListItem } from "@cloud/ui";
import type { Role } from "@/app/(portal)/system/_shared/types";

type RoleListItemProps = {
  role: Role;
  active: boolean;
  onClick: () => void;
};

export function RoleListItem({ role, active, onClick }: RoleListItemProps) {
  return (
    <ListItem active={active} onClick={onClick} icon={<Shield size={16} />}>
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-semibold truncate text-content-primary">{role.name}</span>
        {role.builtin && <Badge variant="outline" className="shrink-0">SYSTEM</Badge>}
      </div>
      <div className="mt-0.5 text-xs text-content-tertiary">{role.permissions.length} permissions</div>
    </ListItem>
  );
}

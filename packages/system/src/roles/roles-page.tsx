"use client";

import { Shield } from "lucide-react";
import type { Role, User } from "../types";
import { RolesPanel } from "./roles-panel";

type RolesPageProps = {
  roles?: Role[];
  setRoles?: (roles: Role[]) => void;
  users?: User[];
};

export function RolesPage({ roles, setRoles, users }: RolesPageProps) {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 className="font-semibold tracking-tight text-content-primary" style={{ fontSize: 26, margin: "0 0 4px" }}>Roles</h1>
        <p className="text-content-secondary" style={{ fontSize: 13.5, margin: 0 }}>
          Carbon platform roles — assignable only to Carbon staff (see <strong>System &rarr; Users</strong>).
          <span className="text-content-tertiary"> All roles here are bound to the <code className="font-mono text-xs">ADMIN</code> contract.</span>
        </p>
      </div>
      <div className="flex flex-col" style={{ gap: 14 }}>
        <div className="flex items-start rounded-lg" style={{ gap: 10, padding: "10px 14px", background: "oklch(94% 0.02 280 / 0.5)", border: "1px solid oklch(55% 0.05 280 / 0.3)", color: "oklch(38% 0.05 280)", fontSize: 12.5 }}>
          <Shield size={14} className="shrink-0 mt-0.5" />
          <div>
            <strong>Internal scope.</strong> These roles are not visible to customer operators.
            They govern access to the Carbon admin platform itself — managing other staff users,
            platform-wide notifications, API keys, and global audit.
          </div>
        </div>
        <RolesPanel roles={roles} setRoles={setRoles} users={users} />
      </div>
    </div>
  );
}

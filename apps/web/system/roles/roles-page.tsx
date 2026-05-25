"use client";

import { Shield } from "lucide-react";
import { Alert, AlertDescription } from "@cloud/ui";
import type { Role, User, PermissionGroup } from "../types";
import { RolesPanel } from "./roles-panel";

type RolesPageProps = {
  initialRoles: Role[];
  users?: User[];
  permissionGroups: PermissionGroup[];
};

export function RolesPage({ initialRoles, users, permissionGroups }: RolesPageProps) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-content-primary mb-1">Roles</h1>
        <p className="text-sm text-content-secondary">
          Carbon platform roles — assignable only to Carbon staff (see <strong>System &rarr; Users</strong>).
          <span className="text-content-tertiary"> All roles here are bound to the <code className="font-mono text-xs">ADMIN</code> contract.</span>
        </p>
      </div>
      <div className="flex flex-col gap-3.5">
        <Alert variant="info">
          <Shield size={14} />
          <AlertDescription>
            <strong>Internal scope.</strong> These roles are not visible to customer operators.
            They govern access to the Carbon admin platform itself — managing other staff users,
            platform-wide notifications, API keys, and global audit.
          </AlertDescription>
        </Alert>
        <RolesPanel initialRoles={initialRoles} users={users} permissionGroups={permissionGroups} />
      </div>
    </div>
  );
}

"use client";

import { Shield } from "lucide-react";
import { Alert, AlertDescription } from "@cloud/ui";
import type { Role, User } from "../types";
import { RolesPanel } from "./roles-panel";

type RolesPageProps = {
  roles?: Role[];
  setRoles?: (roles: Role[]) => void;
  users?: User[];
};

export function RolesPage({ roles, setRoles, users }: RolesPageProps) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-content-primary">Roles</h1>
        <p className="text-sm text-content-secondary mt-1">
          Carbon platform roles — assignable only to Carbon staff (see <strong>System &rarr; Users</strong>).
          <span className="text-content-tertiary"> All roles here are bound to the <code className="font-mono text-xs">ADMIN</code> contract.</span>
        </p>
      </div>
      <Alert>
        <Shield size={14} />
        <AlertDescription>
          <strong>Internal scope.</strong> These roles are not visible to customer operators.
          They govern access to the Carbon admin platform itself — managing other staff users,
          platform-wide notifications, API keys, and global audit.
        </AlertDescription>
      </Alert>
      <RolesPanel roles={roles} setRoles={setRoles} users={users} />
    </div>
  );
}

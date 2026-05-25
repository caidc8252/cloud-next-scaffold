"use client";

import { useContext } from "react";
import { matchesPermissionCheck, type PermissionCheck } from "../index.ts";
import { PermissionsContext } from "./provider.tsx";

export type PermCheck = PermissionCheck;

export function usePermissions(): readonly string[] {
  const permissions = useContext(PermissionsContext);
  if (permissions === null) {
    throw new Error("usePermissions must be used within <PermissionsProvider>");
  }
  return permissions;
}

export function useCan(check: PermCheck): boolean {
  const permissions = usePermissions();
  return matchesPermissionCheck(permissions, check);
}

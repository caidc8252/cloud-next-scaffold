"use client";

import { createContext, type ReactNode } from "react";

export const PermissionsContext = createContext<readonly string[] | null>(null);

export function PermissionsProvider({
  permissions,
  children,
}: {
  permissions: readonly string[];
  children: ReactNode;
}) {
  return (
    <PermissionsContext.Provider value={permissions}>
      {children}
    </PermissionsContext.Provider>
  );
}

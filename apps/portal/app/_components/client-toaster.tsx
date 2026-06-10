"use client";

import { Toaster } from "@cloud/ui";

// Mounts the toast container once at the portal root so any client component
// (e.g. the login screen's "not supported yet" notices) can call toast().
export function ClientToaster() {
  return <Toaster />;
}

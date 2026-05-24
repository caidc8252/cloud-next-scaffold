"use client";

import { useState } from "react";
import { Button, Modal } from "@cloud/ui";
import type { User } from "../types";
import { PASSWORD_POLICY } from "../mock/password-policy";
import { relTime } from "../helpers";

type ResetPasswordModalProps = { open: boolean; onClose: () => void; user: User; onConfirm: () => void };

export function ResetPasswordModal({ open, onClose, user, onConfirm }: ResetPasswordModalProps) {
  const [now] = useState(Date.now);
  const pwAge = user.passwordChangedTimestamp ? Math.floor((now - user.passwordChangedTimestamp) / 86_400_000) : null;

  return (
    <Modal open={open} onClose={onClose} title="Reset password"
      footer={<div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="destructive" onClick={() => { onConfirm(); onClose(); }}>Reset password</Button>
      </div>}>
      <div className="space-y-3 text-sm text-content-secondary">
        <p>Reset the password for <strong>{user.displayName || user.loginName}</strong>? This will generate a new temporary password the user must change on next login.</p>
        {pwAge !== null && (
          <p className="text-xs text-content-tertiary">
            Current password age: {pwAge} days (policy: {PASSWORD_POLICY.expiryDays} days max).
            Last changed: {user.passwordUpdatedAt ? relTime(user.passwordUpdatedAt) : "never"}.
          </p>
        )}
      </div>
    </Modal>
  );
}

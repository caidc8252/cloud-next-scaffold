"use client";

import { useState } from "react";
import { Button, Modal } from "@cloud/ui";

type ConfirmModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Runs on confirm. Resolve `true` on success (dialog closes), `false` to keep it open. */
  onConfirm: () => Promise<boolean>;
  confirmLabel: string;
  /** Confirm-button label while the action is in flight. */
  loadingLabel?: string;
  confirmVariant?: "primary" | "danger";
  cancelLabel?: string;
};

// Shared confirmation dialog. While the action is in flight the confirm button
// shows a spinner and is disabled, and the dialog can't be dismissed by an
// accidental backdrop click — Esc, the X, and Cancel still close it. On confirm
// it closes only after a successful result.
export function ConfirmModal({
  open,
  onClose,
  title,
  children,
  onConfirm,
  confirmLabel,
  loadingLabel,
  confirmVariant = "primary",
  cancelLabel = "Cancel",
}: ConfirmModalProps) {
  const [loading, setLoading] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);

  // 重新打开时清掉上一次可能残留的 in-flight 标志（常驻挂载的确认框不靠卸载重置）
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setLoading(false);
  }

  async function handleConfirm() {
    if (loading) return;
    setLoading(true);
    try {
      const ok = await onConfirm();
      if (ok) onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      title={title}
      closeOnOverlay={!loading}
      onClose={onClose}
      footer={<div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={onClose}>{cancelLabel}</Button>
        <Button variant={confirmVariant} loading={loading} onClick={handleConfirm}>
          {loading ? (loadingLabel ?? confirmLabel) : confirmLabel}
        </Button>
      </div>}
    >
      {children}
    </Modal>
  );
}

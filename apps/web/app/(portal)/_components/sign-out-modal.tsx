"use client";

import { LogOut, Shield } from "lucide-react";
import { Button, Modal } from "@cloud/ui/components/ui";
import { useTranslations } from "@cloud/i18n/client";

// Sign-out confirmation. Mirrors the prototype's confirm dialog (copy + sessions
// note + danger action), but the confirm submits the app's REAL logout route
// (POST /api/auth/logout → clears the session → 303 to /login), reusing the
// existing auth flow instead of the prototype's mock "signed out" screen.
export function SignOutModal({ open, onCancel }: { open: boolean; onCancel: () => void }) {
  const t = useTranslations("account");

  return (
    <Modal
      open={open}
      onClose={onCancel}
      size="sm"
      title={
        <span className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-error-bg text-error-strong">
            <LogOut size={18} />
          </span>
          {t("signOut.title")}
        </span>
      }
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            {t("signOut.cancel")}
          </Button>
          <form action="/api/auth/logout" method="post">
            <Button type="submit" variant="danger" iconLeft={<LogOut size={16} />}>
              {t("signOut.confirm")}
            </Button>
          </form>
        </div>
      }
    >
      <p className="text-sm leading-relaxed text-content-secondary">{t("signOut.body")}</p>
      <div className="mt-3.5 flex items-start gap-2 rounded-lg border border-line-subtle bg-surface-3 px-3 py-2.5 text-xs text-content-tertiary">
        <Shield size={14} className="mt-0.5 flex-none" />
        <span>{t("signOut.note")}</span>
      </div>
    </Modal>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, User } from "lucide-react";
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@cloud/ui/components/ui";
import { toastError } from "@cloud/request/error-toast";
import { useTranslations } from "@cloud/i18n/client";
import { updateAccountProfile } from "@/modules/identity/account/client/account.api";
import type { AccountProfile, Country } from "../../schema/account.types";
import { UPCard, UPHeader } from "./up-chrome";
import { IdentityChangeFlow } from "./identity-change-flow";

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.slice(0, 2).map((w) => w[0] ?? "").join("") || "?").toUpperCase();
}

function FRow({
  label,
  value,
  control,
}: {
  label: React.ReactNode;
  value?: React.ReactNode;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 px-5 py-2.5">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-md font-medium text-content-primary">{label}</span>
        {value && <span className="truncate text-xs text-content-secondary">{value}</span>}
      </div>
      <div className="w-85 flex-none">{control}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-5 pt-4 pb-1 text-xs font-semibold uppercase tracking-wider text-content-tertiary">
      {children}
    </div>
  );
}

export function ProfilePageClient({
  initialProfile,
  countries,
}: {
  initialProfile: AccountProfile;
  countries: Country[];
}) {
  const t = useTranslations("account");
  const router = useRouter();

  const [saved, setSaved] = useState<AccountProfile>(initialProfile);
  const [draft, setDraft] = useState<{ nickName: string; country: string | null }>({
    nickName: initialProfile.nickName,
    country: initialProfile.country,
  });
  const [flow, setFlow] = useState<"email" | null>(null);
  const [busy, setBusy] = useState(false);

  const dirty = draft.nickName !== saved.nickName || draft.country !== saved.country;

  async function save() {
    if (!draft.nickName.trim()) {
      toast.error(t("profile.nameRequired"));
      return;
    }
    setBusy(true);
    try {
      const res = await updateAccountProfile({
        nickName: draft.nickName.trim(),
        country: draft.country,
      });
      setSaved(res.data);
      setDraft({ nickName: res.data.nickName, country: res.data.country });
      router.refresh(); // reflect rename in the sidebar/top bar (session rebuilt server-side)
      toast.success(t("profile.saved"));
    } catch (err) {
      toastError(err);
    } finally {
      setBusy(false);
    }
  }

  function onIdentityApplied(next: AccountProfile) {
    setSaved(next);
    setFlow(null);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <UPHeader icon={<User size={20} />} title={t("profile.title")} sub={t("profile.sub")} />

      <UPCard>
        <div className="flex items-center gap-4 border-b border-line-subtle px-5 py-4">
          <div className="flex size-13 flex-none items-center justify-center rounded-xl bg-primary text-lg font-semibold text-primary-foreground">
            {initialsOf(draft.nickName)}
          </div>
          <div className="min-w-0">
            <div className="text-lg font-semibold text-content-primary">{draft.nickName || "—"}</div>
            <div className="font-mono text-xs text-content-tertiary">{saved.email}</div>
          </div>
        </div>

        <div className="border-b border-line-subtle pb-2">
          <SectionTitle>{t("profile.personal")}</SectionTitle>
          <FRow
            label={t("profile.displayName")}
            control={
              <Input
                value={draft.nickName}
                placeholder={t("profile.displayNamePlaceholder")}
                invalid={!draft.nickName.trim()}
                onChange={(e) => setDraft((d) => ({ ...d, nickName: e.target.value }))}
              />
            }
          />
          <FRow
            label={t("profile.country")}
            control={
              <Select
                value={draft.country ?? ""}
                onValueChange={(v) => setDraft((d) => ({ ...d, country: v ?? null }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(code) => countries.find((c) => c.code === code)?.name ?? String(code ?? "")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          />
        </div>

        <div className="pb-2">
          <SectionTitle>{t("profile.signin")}</SectionTitle>
          <FRow
            label={t("profile.email")}
            value={saved.email}
            control={
              <div className="flex justify-end">
                <Button variant="secondary" size="sm" onClick={() => setFlow("email")}>
                  {t("profile.change")}
                </Button>
              </div>
            }
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-line-subtle bg-surface-3 px-5 py-3.5">
          <Button
            variant="ghost"
            onClick={() => setDraft({ nickName: saved.nickName, country: saved.country })}
            disabled={!dirty || busy}
          >
            {t("profile.discard")}
          </Button>
          <Button variant="primary" iconLeft={<Check size={16} />} onClick={save} disabled={!dirty} loading={busy}>
            {t("profile.save")}
          </Button>
        </div>
      </UPCard>

      {flow && (
        <IdentityChangeFlow
          mode={flow}
          profile={saved}
          onClose={() => setFlow(null)}
          onApplied={onIdentityApplied}
        />
      )}
    </div>
  );
}

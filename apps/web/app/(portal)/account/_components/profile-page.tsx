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
import { request } from "@cloud/request/client";
import { toastError } from "@cloud/request/error-toast";
import { useTranslations } from "@cloud/i18n/client";
import type { Country, Profile } from "@/app/(portal)/account/_shared/types";
import { UPCard, UPHeader } from "./up-chrome";
import { IdentityChangeFlow } from "./identity-change-flow";

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.slice(0, 2).map((w) => w[0] ?? "").join("") || "?").toUpperCase();
}

// One labelled row inside a profile card: label (+ optional value) on the left,
// control on the right.
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
        <span className="text-sm font-medium text-content-primary">{label}</span>
        {value && <span className="truncate text-xs text-content-secondary">{value}</span>}
      </div>
      <div className="w-[340px] flex-none">{control}</div>
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
  initialProfile: Profile;
  countries: Country[];
}) {
  const t = useTranslations("account");
  const router = useRouter();

  const [saved, setSaved] = useState<Profile>(initialProfile);
  const [draft, setDraft] = useState<Profile>(initialProfile);
  const [flow, setFlow] = useState<"email" | "username" | null>(null);
  const [busy, setBusy] = useState(false);

  const dirty = draft.name !== saved.name || draft.country !== saved.country;

  async function save() {
    if (!draft.name.trim()) {
      toast.error(t("profile.nameRequired"));
      return;
    }
    setBusy(true);
    try {
      const res = await request.patch<Profile>("/api/account/profile", {
        name: draft.name.trim(),
        country: draft.country,
      });
      setSaved(res.data);
      setDraft(res.data);
      router.refresh(); // reflect the rename in the sidebar user card
      toast.success(t("profile.saved"));
    } catch (err) {
      toastError(err);
    } finally {
      setBusy(false);
    }
  }

  async function applyIdentity(patch: Partial<Profile>) {
    try {
      const res = await request.patch<Profile>("/api/account/profile", patch);
      setSaved(res.data);
      router.refresh();
    } catch (err) {
      toastError(err);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <UPHeader icon={<User size={20} />} title={t("profile.title")} sub={t("profile.sub")} />

      <UPCard>
        {/* Identity */}
        <div className="flex items-center gap-4 border-b border-line-subtle px-5 py-4">
          <div className="flex size-13 flex-none items-center justify-center rounded-xl bg-primary text-lg font-semibold text-primary-foreground">
            {initialsOf(draft.name)}
          </div>
          <div className="min-w-0">
            <div className="text-lg font-semibold text-content-primary">{draft.name || "—"}</div>
            <div className="font-mono text-xs text-content-tertiary">@{saved.username}</div>
          </div>
        </div>

        {/* Personal details */}
        <div className="border-b border-line-subtle pb-2">
          <SectionTitle>{t("profile.personal")}</SectionTitle>
          <FRow
            label={t("profile.displayName")}
            control={
              <Input
                value={draft.name}
                placeholder={t("profile.displayNamePlaceholder")}
                invalid={!draft.name.trim()}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              />
            }
          />
          <FRow
            label={t("profile.country")}
            control={
              <Select value={draft.country} onValueChange={(v) => setDraft((d) => ({ ...d, country: v ?? "" }))}>
                <SelectTrigger className="w-full">
                  {/* base-ui Select.Value needs a mapper to show the label, not the raw code */}
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

        {/* Sign-in & security */}
        <div className="pb-2">
          <SectionTitle>{t("profile.signin")}</SectionTitle>
          <FRow
            label={t("profile.username")}
            value={saved.username}
            control={
              <div className="flex justify-end">
                <Button variant="secondary" size="sm" onClick={() => setFlow("username")}>
                  {t("profile.change")}
                </Button>
              </div>
            }
          />
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

        {/* Save bar — always present (like the prototype); actions disabled when clean */}
        <div className="flex justify-end gap-2 border-t border-line-subtle bg-surface-3 px-5 py-3.5">
          <Button variant="ghost" onClick={() => setDraft(saved)} disabled={!dirty || busy}>
            {t("profile.discard")}
          </Button>
          <Button variant="primary" iconLeft={<Check size={16} />} onClick={save} disabled={!dirty} loading={busy}>
            {t("profile.save")}
          </Button>
        </div>
      </UPCard>

      {flow && (
        <IdentityChangeFlow mode={flow} user={saved} onClose={() => setFlow(null)} onApply={applyIdentity} />
      )}
    </div>
  );
}

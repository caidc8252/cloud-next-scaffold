"use client";

import { ArrowRight, Check, X } from "lucide-react";
import { Button } from "@cloud/ui";
import { useTranslations } from "@cloud/i18n/client";
import { AuthLead, IconBadge } from "@/app/(auth)/_components/card-bits";
import { ObCard } from "./ob-bits";

export function ObInvalid({ token, onHome }: { token: string; onHome: () => void }) {
  const t = useTranslations("portal.onboarding.invalid");
  return (
    <ObCard centered>
      <AuthLead
        centered
        crest={<IconBadge tone="error" size={52}><X size={22} /></IconBadge>}
        title={t("title")}
        sub={t.rich("sub", {
          token,
          code: (c) => <code className="rounded bg-surface-3 px-1 font-mono text-xs">{c}</code>,
        })}
      />
      <Button className="mt-5" onClick={onHome}>
        {t("home")}
      </Button>
    </ObCard>
  );
}

export function ObWelcome({
  name,
  partner,
  onEnter,
}: {
  name: string;
  partner: string;
  onEnter: () => void;
}) {
  const t = useTranslations("portal.onboarding.welcome");
  const firstName = name.split(" ")[0] || name;
  return (
    <ObCard centered>
      <AuthLead
        centered
        crest={<IconBadge tone="success" size={52}><Check size={26} /></IconBadge>}
        title={t("title", { name: firstName })}
        sub={t.rich("sub", { partner, b: (c) => <strong>{c}</strong> })}
      />
      <div className="pep-confetti" aria-hidden>
        {Array.from({ length: 18 }).map((_, i) => (
          <span key={i} style={{ "--i": i } as React.CSSProperties} />
        ))}
      </div>
      <Button className="mt-5" iconRight={<ArrowRight size={15} />} onClick={onEnter}>
        {t("enter")}
      </Button>
    </ObCard>
  );
}

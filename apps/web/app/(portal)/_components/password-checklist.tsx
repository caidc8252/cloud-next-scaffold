"use client";

import { Check, Minus } from "lucide-react";
import { cn } from "@cloud/ui";
import { useTranslations } from "@cloud/i18n/client";
import { passwordChecks, PW_MIN } from "@/lib/password-rules";

const RULES = ["length", "upper", "lower", "digit", "symbol"] as const;

export function PasswordChecklist({ password }: { password: string }) {
  const t = useTranslations("portal.forgot.rules");
  const checks = passwordChecks(password);
  return (
    <ul className="mt-1 grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
      {RULES.map((rule) => {
        const on = checks[rule];
        return (
          <li
            key={rule}
            className={cn(
              "flex items-center gap-1.5 text-xs",
              on ? "text-success-strong" : "text-content-tertiary",
            )}
          >
            {on ? <Check size={11} className="text-success-500" /> : <Minus size={11} />}
            <span>{rule === "length" ? t("length", { min: PW_MIN }) : t(rule)}</span>
          </li>
        );
      })}
    </ul>
  );
}

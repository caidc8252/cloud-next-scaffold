"use client";

import { useState } from "react";
import { HelpCircle, Info, Mail, MessageSquare } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
  Input,
  toast,
} from "@cloud/ui/components/ui";
import { useTranslations } from "@cloud/i18n/client";
import type { HelpContent } from "@/app/(portal)/account/_shared/types";
import { AccountIcon } from "./account-icon";
import { UPCard, UPHeader } from "./up-chrome";

// Dispatches the global ⌘K so the portal header's command palette opens (it
// owns a document keydown listener for metaKey/ctrlKey + "k").
function openCommandPalette() {
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, ctrlKey: true, bubbles: true }));
}

export function HelpPageClient({ content }: { content: HelpContent }) {
  const t = useTranslations("account");
  const [q, setQ] = useState("");

  const query = q.trim().toLowerCase();
  const faqs = query
    ? content.faqs.filter((f) => (f.question + f.answer).toLowerCase().includes(query))
    : content.faqs;

  return (
    <div className="mx-auto max-w-3xl">
      <UPHeader icon={<HelpCircle size={20} />} title={t("help.title")} sub={t("help.sub")} />

      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("help.searchPlaceholder")}
        prefix={<HelpCircle size={16} />}
        suffix={
          <button
            type="button"
            onClick={openCommandPalette}
            className="cursor-pointer rounded border border-line-default px-1.5 py-0.5 font-mono text-xs text-content-tertiary hover:bg-surface-hover"
          >
            ⌘K
          </button>
        }
        className="mb-4"
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {content.categories.map((c) => (
          <button
            key={c.name}
            type="button"
            onClick={() => toast(t("help.opening", { name: c.name }))}
            className="flex cursor-pointer flex-col items-start gap-2 rounded-xl border border-line-default bg-surface-2 p-4 text-left transition-colors hover:border-line-strong"
          >
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <AccountIcon name={c.icon} size={18} />
            </span>
            <span className="text-sm font-medium text-content-primary">{c.name}</span>
            <span className="text-xs text-content-tertiary">{t("help.articles", { count: c.count })}</span>
          </button>
        ))}
      </div>

      <div className="mb-4">
        <UPCard title={query ? t("help.results", { count: faqs.length }) : t("help.popular")}>
          {faqs.length === 0 ? (
            <p className="px-5 py-6 text-sm text-content-tertiary">{t("help.empty", { q })}</p>
          ) : (
            <Accordion className="rounded-none border-0">
              {faqs.map((f, i) => (
                <AccordionItem key={i} value={String(i)}>
                  <AccordionTrigger>{f.question}</AccordionTrigger>
                  <AccordionContent>{f.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </UPCard>
      </div>

      <UPCard title={t("help.stuck.title")} sub={t("help.stuck.sub")}>
        <div className="flex flex-wrap gap-2 px-5 py-4">
          <Button variant="primary" iconLeft={<MessageSquare size={16} />} onClick={() => toast.success(t("help.chatOpened"))}>
            {t("help.chat")}
          </Button>
          <Button variant="secondary" iconLeft={<Mail size={16} />}>
            {t("help.email")}
          </Button>
          <Button variant="ghost" iconLeft={<Info size={16} />} onClick={openCommandPalette}>
            {t("help.shortcuts")}
          </Button>
        </div>
      </UPCard>
    </div>
  );
}

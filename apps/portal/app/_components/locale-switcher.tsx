"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Globe } from "lucide-react";
import { Button, Popover, PopoverContent, PopoverTrigger, MenuItem } from "@cloud/ui/components/ui";
import { useLocale } from "@cloud/i18n/client";
import { locales, localeLabels, type Locale } from "@cloud/i18n";
import { setLocaleAction } from "@cloud/i18n/actions";

// Language switch: globe button → popover of locales (current bold + check).
// Popover (not DropdownMenu) so it layers above the sticky header (z-popover).
// Locale list is fixed by @cloud/i18n (en / zh-CN / ja).
export function LocaleSwitcher({ onDark = false }: { onDark?: boolean }) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function selectLocale(next: Locale) {
    setOpen(false);
    if (next === locale) return;
    startTransition(async () => {
      await setLocaleAction(next);
      router.refresh();
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Select language"
            disabled={pending}
            className={
              onDark
                ? "text-white/80 hover:bg-white/10 hover:text-white aria-expanded:bg-white/10"
                : "text-content-secondary"
            }
          />
        }
      >
        <Globe size={15} />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-auto min-w-44 gap-0 rounded-lg border border-line-default bg-surface-2 p-1 text-content-primary shadow-4 ring-0"
      >
        {locales.map((l) => (
          <MenuItem
            key={l}
            onClick={() => selectLocale(l)}
            className={l === locale ? "gap-1.5 pr-8 font-semibold" : "gap-1.5 pr-8"}
          >
            <span className="flex-1">{localeLabels[l]}</span>
            {l === locale && <Check size={15} />}
          </MenuItem>
        ))}
      </PopoverContent>
    </Popover>
  );
}

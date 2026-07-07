"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Globe } from "lucide-react";
import { Button, Popover, PopoverContent, PopoverTrigger, MenuItem } from "@cloud/ui/components/ui";
import { useLocale } from "@cloud/i18n/client";
import { locales, localeLabels, type Locale } from "@cloud/i18n";
import { setLocaleAction } from "@cloud/i18n/actions";
import { setLocaleAction } from "@cloud/i18n/actions";

// 语言切换：地球图标按钮触发弹层，列出 locale（当前项加粗 + 勾选）。
// 选中即写 locale cookie 并 router.refresh()。语言清单固定来自 @cloud/i18n（en/zh-CN/ja）。
//
// 用 Popover 而非 DropdownMenu：header 是 `sticky z-sticky`(1020)，而 @cloud/ui 的
// DropdownMenuContent 把 Positioner 钉死在 `z-50`、且不暴露 Positioner 的 className，
// 业务侧无法抬层，弹层顶部会被 header 盖住。Popover 用语义层 `z-popover`(1060) 高于
// header，和相邻的 NotificationBell 一致。（DropdownMenu 的 z-50 是 @cloud/ui 的待修 bug。）
//
// 因为 @cloud/ui 依赖 @cloud/i18n，开关 UI 放在 apps/admin 组合 @cloud/ui primitives，
// 不能放回 @cloud/i18n（会循环依赖）。
export function LocaleSwitcher() {
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
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Select language"
            disabled={pending}
            className="rounded-lg text-content-secondary hover:text-content-primary aria-expanded:bg-surface-hover"
          >
            <Globe size={15} />
          </Button>
        }
      />
      <PopoverContent
        align="end"
        sideOffset={8}
        // 容器边框 / 背景 / 阴影 / 内距对齐 DropdownMenuContent（border 取代 ring、
        // bg-surface-2、shadow-4、p-1），只是组件仍用 Popover 以保证 z 层在 header 之上。
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

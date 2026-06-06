"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Globe,
  HelpCircle,
  LogOut,
  Monitor,
  Moon,
  Shield,
  Sun,
  User,
} from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  Popover,
  PopoverContent,
  PopoverTrigger,
  toast,
} from "@cloud/ui/components/ui";
import { cn, useSidebar } from "@cloud/ui";
import { useLocale } from "@cloud/i18n/client";
import { useTranslations } from "@cloud/i18n/client";
import { locales, localeLabels, type Locale } from "@cloud/i18n";
import { setLocaleAction } from "@cloud/i18n/actions";
import { useThemePref, type ThemePref } from "./use-theme-pref";
import { SignOutModal } from "./sign-out-modal";

type UserMenuProps = {
  account: string;
  name: string;
  email: string;
};

function getInitials(name: string, account: string) {
  const source = name.trim() || account.trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

const THEME_ICON: Record<ThemePref, ReactNode> = {
  light: <Sun size={16} />,
  dark: <Moon size={16} />,
  system: <Monitor size={16} />,
};

// A single popover row: icon chip + label (+ optional sub) + optional trailing.
function MenuRow({
  icon,
  label,
  sub,
  trailing,
  danger,
  onClick,
}: {
  icon: ReactNode;
  label: ReactNode;
  sub?: ReactNode;
  trailing?: ReactNode;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors",
        danger ? "hover:bg-error-bg" : "hover:bg-surface-hover",
      )}
    >
      <span
        className={cn(
          "flex size-6 flex-none items-center justify-center rounded-md",
          danger ? "bg-error-bg text-error-strong" : "bg-surface-3 text-content-secondary",
        )}
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={cn("text-sm font-medium", danger ? "text-error-strong" : "text-content-primary")}>
          {label}
        </span>
        {sub && <span className="truncate text-xs text-content-tertiary">{sub}</span>}
      </span>
      {trailing && (
        <span className="flex flex-none items-center gap-1 text-xs text-content-tertiary">{trailing}</span>
      )}
    </button>
  );
}

function SubHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-2 px-1 pb-1">
      <button
        type="button"
        onClick={onBack}
        className="flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-content-secondary transition-colors hover:bg-surface-hover hover:text-content-primary"
      >
        <ChevronLeft size={14} />
        {title}
      </button>
    </div>
  );
}

function OptionRow({
  icon,
  label,
  sub,
  selected,
  onClick,
}: {
  icon: ReactNode;
  label: ReactNode;
  sub?: ReactNode;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-surface-hover"
    >
      <span className="flex size-6 flex-none items-center justify-center rounded-md bg-surface-3 text-content-secondary">
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-medium text-content-primary">{label}</span>
        {sub && <span className="text-xs text-content-tertiary">{sub}</span>}
      </span>
      {selected && <Check size={15} className="flex-none text-primary" />}
    </button>
  );
}

export function UserMenu({ account, name, email }: UserMenuProps) {
  const { collapsed, isMobile } = useSidebar();
  const rail = collapsed && !isMobile;
  const router = useRouter();
  const t = useTranslations("account");

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"main" | "theme" | "lang">("main");
  const [signOutOpen, setSignOutOpen] = useState(false);

  const { pref, setTheme } = useThemePref();
  const locale = useLocale() as Locale;
  const [, startTransition] = useTransition();

  const initials = getInitials(name, account);

  const themeLabel = t(`theme.${pref}`);

  function openChange(next: boolean) {
    setOpen(next);
    if (next) setView("main");
  }

  function go(path: string) {
    setOpen(false);
    router.push(path);
  }

  function chooseTheme(next: ThemePref) {
    setTheme(next);
    toast.success(t(`theme.toast.${next}`));
  }

  function chooseLocale(next: Locale) {
    setOpen(false);
    if (next === locale) return;
    startTransition(async () => {
      await setLocaleAction(next);
      router.refresh();
    });
  }

  return (
    <>
      <Popover open={open} onOpenChange={openChange}>
        <PopoverTrigger
          render={
            <button
              type="button"
              aria-label={rail ? t("menu.aria", { name }) : undefined}
              className={
                rail
                  ? "flex w-full cursor-pointer justify-center rounded-lg p-1.5 transition-colors hover:bg-surface-hover aria-expanded:bg-surface-hover"
                  : "flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface-hover aria-expanded:bg-surface-hover"
              }
            >
              <Avatar size="md">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              {!rail && (
                <>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium text-content-primary">{name}</div>
                    <div className="truncate text-xs text-content-tertiary">{email}</div>
                  </div>
                  <ChevronRight size={12} className="shrink-0 text-content-tertiary" />
                </>
              )}
            </button>
          }
        />
        <PopoverContent
          side="top"
          align="start"
          sideOffset={8}
          className="w-72 gap-0 overflow-hidden rounded-xl border border-line-default bg-surface-2 p-0 text-content-primary shadow-4 ring-0"
        >
          {view === "main" && (
            <>
              {/* Identity header */}
              <div className="flex items-center gap-3 border-b border-line-subtle bg-surface-3 px-4 py-3.5">
                <div className="flex size-10 flex-none items-center justify-center rounded-lg bg-primary font-semibold text-primary-foreground">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-content-primary">{name}</div>
                  <div className="truncate text-xs text-content-tertiary">{email}</div>
                </div>
              </div>

              <div className="p-1">
                <MenuRow icon={<User size={16} />} label={t("menu.profile")} onClick={() => go("/account/profile")} />
                <MenuRow
                  icon={<Shield size={16} />}
                  label={t("menu.security")}
                  sub={t("menu.securitySub")}
                  onClick={() => go("/account/security")}
                />
                <MenuRow
                  icon={<Building2 size={16} />}
                  label={t("menu.partners")}
                  trailing={<ChevronRight size={12} />}
                  onClick={() => go("/account/partners")}
                />
              </div>

              <div className="border-t border-line-subtle p-1">
                <MenuRow
                  icon={THEME_ICON[pref]}
                  label={t("menu.theme")}
                  trailing={
                    <>
                      <span className="font-medium">{themeLabel}</span>
                      <ChevronRight size={12} />
                    </>
                  }
                  onClick={() => setView("theme")}
                />
                <MenuRow
                  icon={<Globe size={16} />}
                  label={t("menu.language")}
                  trailing={
                    <>
                      <span className="font-medium">{localeLabels[locale]}</span>
                      <ChevronRight size={12} />
                    </>
                  }
                  onClick={() => setView("lang")}
                />
              </div>

              <div className="border-t border-line-subtle p-1">
                <MenuRow
                  icon={<Activity size={16} />}
                  label={t("menu.activity")}
                  sub={t("menu.activitySub")}
                  onClick={() => go("/account/activity")}
                />
                <MenuRow
                  icon={<HelpCircle size={16} />}
                  label={t("menu.help")}
                  trailing={<kbd className="rounded border border-line-default px-1.5 py-0.5 font-mono text-xs">?</kbd>}
                  onClick={() => go("/account/help")}
                />
              </div>

              <div className="border-t border-line-subtle p-1">
                <MenuRow
                  icon={<LogOut size={16} />}
                  label={t("menu.signOut")}
                  danger
                  onClick={() => {
                    setOpen(false);
                    setSignOutOpen(true);
                  }}
                />
              </div>
            </>
          )}

          {view === "theme" && (
            <div className="p-2">
              <SubHeader title={t("common.back")} onBack={() => setView("main")} />
              <div className="px-1 pb-1 text-sm font-semibold">{t("menu.theme")}</div>
              {(["light", "dark", "system"] as ThemePref[]).map((opt) => (
                <OptionRow
                  key={opt}
                  icon={THEME_ICON[opt]}
                  label={t(`theme.${opt}`)}
                  sub={t(`theme.desc.${opt}`)}
                  selected={pref === opt}
                  onClick={() => chooseTheme(opt)}
                />
              ))}
            </div>
          )}

          {view === "lang" && (
            <div className="p-2">
              <SubHeader title={t("common.back")} onBack={() => setView("main")} />
              <div className="px-1 pb-1 text-sm font-semibold">{t("menu.language")}</div>
              {locales.map((l) => (
                <OptionRow
                  key={l}
                  icon={<Globe size={16} />}
                  label={localeLabels[l]}
                  selected={l === locale}
                  onClick={() => chooseLocale(l)}
                />
              ))}
              <p className="px-2.5 pt-2 text-xs leading-snug text-content-tertiary">{t("language.note")}</p>
            </div>
          )}
        </PopoverContent>
      </Popover>

      <SignOutModal open={signOutOpen} onCancel={() => setSignOutOpen(false)} />
    </>
  );
}

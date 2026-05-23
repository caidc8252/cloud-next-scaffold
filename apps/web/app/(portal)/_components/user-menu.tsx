"use client";

import { useState } from "react";
import { ChevronRight, LogOut, Moon, Sun, User } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@cloud/ui/components/ui";

type UserMenuProps = {
  account: string;
  name: string;
  roleName: string;
};

function getInitials(name: string, account: string) {
  const source = name.trim() || account.trim();
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

export function UserMenu({ account, name, roleName }: UserMenuProps) {
  const [isDark, setIsDark] = useState(() => {
    if (typeof document === "undefined") {
      return false;
    }

    const root = document.documentElement;
    return root.classList.contains("dark") || root.getAttribute("data-theme") === "dark";
  });

  const toggleTheme = () => {
    const next = !isDark;
    const root = document.documentElement;

    setIsDark(next);
    root.setAttribute("data-theme", next ? "dark" : "light");
    root.classList.toggle("dark", next);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface-hover">
        <Avatar size="md">
          <AvatarFallback>{getInitials(name, account)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-medium text-content-primary">{name}</div>
          <div className="truncate text-xs text-content-tertiary">
            {account} / {roleName}
          </div>
        </div>
        <ChevronRight size={12} className="shrink-0 text-content-tertiary" />
      </DropdownMenuTrigger>

      <DropdownMenuContent side="top" align="start" className="w-56">
        <DropdownMenuLabel className="font-normal normal-case tracking-normal">
          <div className="text-xs font-medium text-content-primary">{name}</div>
          <div className="text-xs text-content-tertiary">
            {account} / {roleName}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem disabled>
          <User size={14} />
          Current User
        </DropdownMenuItem>

        <DropdownMenuItem onClick={toggleTheme}>
          {isDark ? <Sun size={14} /> : <Moon size={14} />}
          {isDark ? "Switch to light" : "Switch to dark"}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="flex w-full cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-2 text-left text-xs text-error-strong outline-hidden transition-colors hover:bg-error-bg"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

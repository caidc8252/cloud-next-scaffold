"use client";

import { useCallback, useEffect, useState } from "react";

// Theme preference for the user menu's Theme sub-view.
//
// Drives the real, already-working theme mechanism in this app — toggling
// `data-theme` + the `.dark` class on <html> — and extends it with "system"
// (follow OS) plus localStorage persistence, exactly like the prototype's own
// theme effect. There is no ThemeProvider mounted, so this DOM toggle is the
// authoritative mechanism.

export type ThemePref = "light" | "dark" | "system";

const STORAGE_KEY = "toms.theme";

function prefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(pref: ThemePref) {
  const root = document.documentElement;
  const dark = pref === "dark" || (pref === "system" && prefersDark());
  root.setAttribute("data-theme", dark ? "dark" : "light");
  root.classList.toggle("dark", dark);
}

function readStored(): ThemePref {
  if (typeof localStorage === "undefined") return "system";
  const value = localStorage.getItem(STORAGE_KEY);
  return value === "light" || value === "dark" || value === "system" ? value : "system";
}

export function useThemePref() {
  const [pref, setPref] = useState<ThemePref>("system");

  // Hydrate from storage and apply once on mount. localStorage is client-only,
  // so this must run after mount (reading it during render would break SSR
  // hydration) — the setState here is the intended pattern, not a cascade.
  useEffect(() => {
    const stored = readStored();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only hydration after mount
    setPref(stored);
    applyTheme(stored);
  }, []);

  // While following the system, react to OS appearance changes.
  useEffect(() => {
    if (pref !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [pref]);

  const setTheme = useCallback((next: ThemePref) => {
    setPref(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // storage unavailable (private mode) — apply for the session anyway
    }
    applyTheme(next);
  }, []);

  return { pref, setTheme };
}

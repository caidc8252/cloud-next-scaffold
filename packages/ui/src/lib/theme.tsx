"use client"

import * as React from "react"

type Theme = "light" | "dark"

interface ThemeContextValue {
  preference: Theme
  resolved: Theme
  set: (theme: Theme) => void
  toggle: () => void
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null)

function useTheme() {
  const ctx = React.useContext(ThemeContext)
  if (!ctx) {
    // Return a no-op fallback so components don't crash when used outside a provider
    return {
      preference: "light" as Theme,
      resolved: "light" as Theme,
      set: () => {},
      toggle: () => {},
    }
  }
  return ctx
}

function ThemeProvider({
  children,
  defaultTheme = "light",
}: {
  children: React.ReactNode
  defaultTheme?: Theme
}) {
  const [preference, setPreference] = React.useState<Theme>(defaultTheme)

  const value = React.useMemo<ThemeContextValue>(
    () => ({
      preference,
      resolved: preference,
      set: setPreference,
      toggle: () =>
        setPreference((prev) => (prev === "light" ? "dark" : "light")),
    }),
    [preference],
  )

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  )
}

export { useTheme, ThemeProvider, type Theme }

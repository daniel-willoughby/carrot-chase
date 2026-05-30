"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  isDark: boolean;
  toggle: () => void;
  setTheme: (t: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

// Re-export so existing imports from "@/lib/theme/theme-provider" still work,
// but the actual constant lives in a non-client module to dodge the Next 16
// server/client import boundary, which turns this string into `undefined`
// when imported into a Server Component (root layout).
export { THEME_COOKIE } from "./cookie";
import { THEME_COOKIE } from "./cookie";
const ONE_YEAR = 60 * 60 * 24 * 365;

function writeThemeCookie(theme: Theme) {
  if (typeof document === "undefined") return;
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
}

export function ThemeProvider({
  children,
  initial = "light",
}: {
  children: ReactNode;
  initial?: Theme;
}) {
  const [theme, setThemeState] = useState<Theme>(initial);

  // Sync state to the actual DOM attribute on first paint — the server has
  // already set data-theme based on the cookie, so there's no flash.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    document.documentElement.setAttribute("data-theme", t);
    writeThemeCookie(t);
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === "dark", toggle, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

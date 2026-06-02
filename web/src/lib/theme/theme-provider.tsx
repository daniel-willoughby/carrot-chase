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

function readThemeCookie(): Theme | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${THEME_COOKIE}=(dark|light)`),
  );
  return (m?.[1] as Theme) ?? null;
}

export function ThemeProvider({
  children,
  initial = "light",
}: {
  children: ReactNode;
  initial?: Theme;
}) {
  const [theme, setThemeState] = useState<Theme>(initial);

  // After hydration, reconcile React state with the *live* cookie. The inline
  // <head> script has already set the correct data-theme on <html> before the
  // first paint, so this never causes a flash — it only pulls that same value
  // into React state so theme-aware UI agrees with what's painted.
  //
  // We deliberately read the cookie rather than trust the `initial` prop here:
  // `initial` comes from the server render, which (if ever served stale from a
  // cache) could overwrite the inline script's correct value with a wrong one.
  // Reading the cookie guarantees we only ever write the true theme.
  useEffect(() => {
    const live = readThemeCookie() ?? initial;
    setThemeState(live);
    document.documentElement.setAttribute("data-theme", live);
  }, [initial]);

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

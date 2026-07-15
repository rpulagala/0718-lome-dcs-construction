"use client";

import { createContext, useCallback, useContext, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

/**
 * Portal-scoped light/dark theme. The `dark` class is applied to a wrapper div
 * that lives ONLY under `/app`, so dark mode never bleeds into the staff console
 * or the public marketing site (which have no dark styling). The choice is a
 * client-only value (localStorage, falling back to the OS `prefers-color-scheme`),
 * read via `useSyncExternalStore` so there's no hydration mismatch and no
 * setState-in-effect.
 */
type Theme = "light" | "dark";
const STORAGE_KEY = "dcs-portal-theme";

const listeners = new Set<() => void>();

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  if (typeof window !== "undefined") window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    if (typeof window !== "undefined") window.removeEventListener("storage", cb);
  };
}

function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

function writeTheme(t: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, t);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

const ThemeCtx = createContext<{ theme: Theme; setTheme: (t: Theme) => void } | null>(null);

export function usePortalTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("usePortalTheme must be used within PortalThemeProvider");
  return ctx;
}

export function PortalThemeProvider({ children }: { children: React.ReactNode }) {
  // Server + hydration render "light"; the client value applies right after.
  const theme = useSyncExternalStore(subscribe, readTheme, () => "light" as Theme);
  const setTheme = useCallback((t: Theme) => writeTheme(t), []);

  return (
    <ThemeCtx.Provider value={{ theme, setTheme }}>
      <div className={theme === "dark" ? "dark" : undefined}>{children}</div>
    </ThemeCtx.Provider>
  );
}

/** Light/Dark segmented control — used on the Profile screen. */
export function ThemeToggle() {
  const { theme, setTheme } = usePortalTheme();
  const opt =
    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy";
  return (
    <div
      className="flex rounded-full bg-slate-100 p-0.5 dark:bg-slate-800"
      role="group"
      aria-label="Appearance"
    >
      <button
        type="button"
        onClick={() => setTheme("light")}
        aria-pressed={theme === "light"}
        data-testid="theme-light"
        className={`${opt} ${theme === "light" ? "bg-white text-brand-navy shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}
      >
        <Sun className="h-3.5 w-3.5" aria-hidden />
        Light
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        aria-pressed={theme === "dark"}
        data-testid="theme-dark"
        className={`${opt} ${theme === "dark" ? "bg-white text-brand-navy shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}
      >
        <Moon className="h-3.5 w-3.5" aria-hidden />
        Dark
      </button>
    </div>
  );
}

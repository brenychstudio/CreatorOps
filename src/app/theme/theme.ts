// src/app/theme/theme.ts
export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "creatorops_theme";

export function isTheme(x: unknown): x is Theme {
  return x === "light" || x === "dark";
}

export function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
}

import {
  createContext,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { Theme } from "./theme";

type ThemeCtx = {
  theme: Theme; // resolved theme (light/dark)
  hasUserChoice: boolean; // залишаємо для сумісності
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  resetToSystem: () => void; // у нас = reset to dark
  asset: (lightSrc: string, darkSrc: string) => string;
};

export const ThemeContext = createContext<ThemeCtx | null>(null);

function applyThemeToDOM(theme: Theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // ВАЖЛИВО: default завжди dark
  const [theme, setThemeState] = useState<Theme>("dark");

  // щоб не анімувати перший рендер
  const didInitRef = useRef(false);

  // 1) без “flash” — ставимо тему до першого пейнта
  useLayoutEffect(() => {
    applyThemeToDOM(theme);
  }, [theme]);

  // 2) плавність — додаємо клас на html лише при зміні теми
  useEffect(() => {
    if (typeof window === "undefined") return;

    // не анімуємо перший рендер
    if (!didInitRef.current) {
      didInitRef.current = true;
      return;
    }

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduce) return;

    const root = document.documentElement;
    root.classList.add("theme-animate");

    const t = window.setTimeout(() => {
      root.classList.remove("theme-animate");
    }, 900);

    return () => window.clearTimeout(t);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const resetToSystem = useCallback(() => {
    // Для цього проєкту “system” не використовуємо → повертаємось у dark
    setThemeState("dark");
  }, []);

  const asset = useCallback(
    (lightSrc: string, darkSrc: string) => (theme === "dark" ? darkSrc : lightSrc),
    [theme]
  );

  const value = useMemo<ThemeCtx>(
    () => ({
      theme,
      hasUserChoice: false,
      setTheme,
      toggleTheme,
      resetToSystem,
      asset,
    }),
    [theme, setTheme, toggleTheme, resetToSystem, asset]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

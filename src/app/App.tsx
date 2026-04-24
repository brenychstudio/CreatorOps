// src/app/App.tsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import AppRoutes from "./routes";
import ThemeToggle from "./theme/ThemeToggle";
import { useTheme } from "./theme/useTheme";

export default function App() {
  const { pathname } = useLocation();
  const showThemeToggle = pathname.startsWith("/prototype");

  const { theme, setTheme } = useTheme();

  // ВАЖЛИВО: лендінг/сторі завжди dark (навіть якщо в прототипі перемкнули на light)
  useEffect(() => {
    if (!showThemeToggle && theme !== "dark") setTheme("dark");
  }, [showThemeToggle, theme, setTheme]);

  return (
    <>
      {showThemeToggle ? <ThemeToggle className="fixed right-4 top-4 z-[60] hidden md:inline-flex" /> : null}
      <AppRoutes />
    </>
  );
}

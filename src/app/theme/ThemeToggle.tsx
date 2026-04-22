// src/app/theme/ThemeToggle.tsx
import { useTheme } from "./useTheme";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  const base =
    "inline-flex items-center gap-1 rounded-full border px-1 py-1 backdrop-blur shadow-sm";
  const shell =
    theme === "dark" ? "bg-black/35 border-white/10" : "bg-white/70 border-black/10";

  const btnBase =
    "pressable rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-300";
  const on =
    theme === "dark" ? "bg-white/12 text-white" : "bg-black/5 text-black";
  const off =
    theme === "dark" ? "text-white/65 hover:bg-white/8" : "text-black/55 hover:bg-black/3";

  return (
    <div className={[base, shell, className].join(" ")}>
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={[btnBase, theme === "light" ? on : off].join(" ")}
        aria-pressed={theme === "light"}
      >
        Light
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={[btnBase, theme === "dark" ? on : off].join(" ")}
        aria-pressed={theme === "dark"}
      >
        Dark
      </button>
    </div>
  );
}

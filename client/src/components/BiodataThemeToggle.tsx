import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export function BiodataThemeToggle() {
  const { theme, toggleTheme, switchable } = useTheme();
  if (!switchable || !toggleTheme) return null;
  const isDark = theme === "dark";
  return <button type="button" aria-pressed={isDark} onClick={toggleTheme} className="biodata-theme-toggle inline-flex items-center gap-2 rounded-xl border border-[#cbd9d0] bg-white px-3.5 py-2.5 text-sm font-bold text-[#0f5c4f] transition hover:bg-[#f2f7f3] dark:border-[#3d554b] dark:bg-[#1a2822] dark:text-[#b7e4c5] dark:hover:bg-[#23352d]">{isDark ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}<span>{isDark ? "Light mode" : "Dark mode"}</span></button>;
}

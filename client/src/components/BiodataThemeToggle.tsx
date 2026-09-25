import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export function BiodataThemeToggle() {
  const { theme, toggleTheme, switchable } = useTheme();
  if (!switchable || !toggleTheme) return null;
  const isDark = theme === "dark";
  const action = isDark ? "Use light theme" : "Use dark theme";
  return (
    <button
      type="button"
      aria-label={action}
      title={action}
      aria-pressed={isDark}
      onClick={toggleTheme}
      className="biodata-theme-toggle inline-flex h-11 w-11 items-center justify-center gap-2 rounded-full border border-[#cbd9d0] bg-white px-0 text-sm font-bold text-[#0f5c4f] transition hover:bg-[#f2f7f3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5c4f] focus-visible:ring-offset-2 sm:h-auto sm:w-auto sm:justify-start sm:rounded-xl sm:px-3.5 sm:py-2.5 dark:border-[#527164] dark:bg-[#17241e] dark:text-[#c9f3d6] dark:hover:bg-[#23352d] dark:focus-visible:ring-[#9bdcaf] dark:focus-visible:ring-offset-[#0d1512]"
    >
      {isDark ? (
        <Sun className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4" aria-hidden="true" />
      )}
      <span className="sr-only sm:not-sr-only">
        {isDark ? "Light mode" : "Dark mode"}
      </span>
    </button>
  );
}

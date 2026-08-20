import React, { createContext, useContext, useEffect, useState } from "react";
import { nextTheme, normaliseTheme, NSOS_THEME_STORAGE_KEY, type NsosTheme } from "@/lib/themePreference";

type Theme = NsosTheme;

interface ThemeContextType {
  theme: Theme;
  toggleTheme?: () => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
  switchable = false,
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (switchable) {
      try { return normaliseTheme(localStorage.getItem(NSOS_THEME_STORAGE_KEY), defaultTheme); } catch { return defaultTheme; }
    }
    return defaultTheme;
  });

  useEffect(() => {
    if (switchable) {
      try { localStorage.setItem(NSOS_THEME_STORAGE_KEY, theme); } catch { /* preference storage unavailable */ }
    }
  }, [theme, switchable]);

  const toggleTheme = switchable
    ? () => {
        setTheme(nextTheme);
      }
    : undefined;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, switchable }}>
      <div className={`nsos-theme-scope ${theme === "dark" ? "dark" : ""}`}>{children}</div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

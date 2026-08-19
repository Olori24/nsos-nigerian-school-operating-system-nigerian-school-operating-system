export type NsosTheme = "light" | "dark";
export const NSOS_THEME_STORAGE_KEY = "nsos-theme";

export function normaliseTheme(value: string | null | undefined, fallback: NsosTheme = "light"): NsosTheme {
  return value === "dark" || value === "light" ? value : fallback;
}

export function nextTheme(theme: NsosTheme): NsosTheme {
  return theme === "light" ? "dark" : "light";
}

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { nextTheme, normaliseTheme, NSOS_THEME_STORAGE_KEY } from "../client/src/lib/themePreference";

const projectRoot = resolve(import.meta.dirname, "..");
const appSource = readFileSync(resolve(projectRoot, "client/src/App.tsx"), "utf8");
const styles = readFileSync(resolve(projectRoot, "client/src/index.css"), "utf8");
const previewDialog = readFileSync(resolve(projectRoot, "client/src/components/BiodataPreviewDialog.tsx"), "utf8");

describe("biodata dark-mode preference", () => {
  it("normalizes a persistent theme preference safely and switches both directions", () => {
    expect(NSOS_THEME_STORAGE_KEY).toBe("nsos-theme");
    expect(normaliseTheme("dark")).toBe("dark");
    expect(normaliseTheme("unexpected", "dark")).toBe("dark");
    expect(nextTheme("light")).toBe("dark");
    expect(nextTheme("dark")).toBe("light");
  });

  it("mounts a persistent switchable theme and covers preview, recovery, validation, and clear-form low-light states", () => {
    expect(appSource).toContain('<ThemeProvider defaultTheme="light" switchable>');
    expect(appSource).toContain("BiodataThemeToggle");
    expect(styles).toContain(".dark .biodata-draft-notice");
    expect(styles).toContain(".dark .biodata-field-feedback");
    expect(styles).toContain(".dark .biodata-clear-confirmation");
    expect(styles).toContain(".dark .biodata-dialog");
    expect(previewDialog).toContain("biodata-preview-trigger");
    expect(previewDialog).toContain("biodata-dialog");
  });
});

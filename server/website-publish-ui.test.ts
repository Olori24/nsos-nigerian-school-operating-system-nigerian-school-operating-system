import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { isNsosPlatformHost } from "../client/src/lib/hostRouting";

const root = resolve(import.meta.dirname, "..");
const studio = readFileSync(resolve(root, "client/src/components/WebsiteStudio.tsx"), "utf8");
const theme = readFileSync(resolve(root, "client/src/contexts/ThemeContext.tsx"), "utf8");
const css = readFileSync(resolve(root, "client/src/index.css"), "utf8");
const viteConfig = readFileSync(resolve(root, "vite.config.ts"), "utf8");

describe("school website publishing and theme presentation", () => {
  it("excludes the Manus runtime plugin from Vercel builds", () => {
    expect(viteConfig).toContain('process.env.VERCEL === "1" ? [] : [vitePluginManusRuntime()]');
  });
  it("exposes school-owned visual direction controls in Website Studio", () => {
    expect(studio).toContain("Visual direction");
    expect(studio).toContain("modern");
    expect(studio).toContain("academic");
    expect(studio).toContain("community");
    expect(studio).toContain('visualTheme: site.visualTheme ?? "modern"');
    expect(studio).toContain("visualTheme: form.visualTheme");
    expect(studio).toContain("School story & content");
    expect(studio).toContain("websiteContent:");
    expect(studio).toContain("Programmes / learning areas");
    expect(studio).toContain("FAQs — one per line: Question | Answer");
  });

  it("routes platform hosts to NSOS and custom domains to the school website resolver", () => {
    expect(isNsosPlatformHost("staging.nsos.top")).toBe(true);
    expect(isNsosPlatformHost("nsos-preview-abc.vercel.app")).toBe(true);
    expect(isNsosPlatformHost("school.example.ng")).toBe(false);
  });

  it("provides explicit publish and unpublish actions while keeping custom domains optional", () => {
    expect(studio).toContain("Publish website");
    expect(studio).toContain("Unpublish website");
    expect(studio).toContain("Publishing does not require a custom domain.");
    expect(studio).toContain("Publishing immediately activates the school’s NSOS public link.");
  });

  it("scopes dark mode to the NSOS application and includes website-specific high-contrast treatment", () => {
    expect(theme).toContain("nsos-theme-scope");
    expect(theme).not.toContain("document.documentElement");
    expect(css).toContain(".dark .school-website-studio");
    expect(css).toContain(".dark .school-public-site");
  });
});

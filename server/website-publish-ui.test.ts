import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const app = readFileSync(resolve(root, "client/src/App.tsx"), "utf8");
const studio = readFileSync(resolve(root, "client/src/components/WebsiteStudio.tsx"), "utf8");
const theme = readFileSync(resolve(root, "client/src/contexts/ThemeContext.tsx"), "utf8");
const css = readFileSync(resolve(root, "client/src/index.css"), "utf8");

describe("school website publishing and theme presentation", () => {
  it("routes verified custom-domain visitors through the public domain resolver", () => {
    expect(app).toContain('import DomainSchoolWebsite from "./pages/DomainSchoolWebsite"');
    expect(app).toContain("isNsosPlatformHost");
    expect(app).toContain("return <DomainSchoolWebsite />");
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

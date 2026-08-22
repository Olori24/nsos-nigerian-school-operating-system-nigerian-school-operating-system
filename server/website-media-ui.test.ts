import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const agent = readFileSync(resolve(import.meta.dirname, "../client/src/components/WebsiteSetupAgent.tsx"), "utf8");
const publicWebsite = readFileSync(resolve(import.meta.dirname, "../client/src/pages/SchoolWebsite.tsx"), "utf8");

describe("website media library interface", () => {
  it("uses owner-provided images only through an explicit media-library selection", () => {
    expect(agent).toContain("School-owned media library");
    expect(agent).toContain("Add logo");
    expect(agent).toContain("Add hero image");
    expect(agent).toContain("checks the file signature");
    expect(agent).toContain("never generates images or public claims");
    expect(agent).toContain("logoMediaId, heroMediaId");
    expect(agent).toContain("Website visual style");
    expect(agent).toContain("Academic heritage");
    expect(agent).toContain("Community warmth");
    expect(agent).toContain("visualTheme");
  });

  it("renders selected assets with safe fallback branding in draft and public website layouts", () => {
    expect(publicWebsite).toContain("website.logoUrl ? <img");
    expect(publicWebsite).toContain("website.heroUrl && <img");
    expect(publicWebsite).toContain("School-provided website hero");
    expect(publicWebsite).toContain("<GraduationCap");
    expect(publicWebsite).toContain("const visualTheme = website.visualTheme ?? \"modern\"");
    expect(publicWebsite).toContain("data-visual-theme={visualTheme}");
    expect(publicWebsite).toContain("Education with purpose");
    expect(publicWebsite).toContain("Together, we grow");
  });
});

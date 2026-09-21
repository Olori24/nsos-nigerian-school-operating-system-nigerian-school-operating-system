import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PUBLIC_MARKETING_PATHS } from "../client/src/pages/PublicMarketingPage";
import { NSOS_LLMS, NSOS_ROBOTS, NSOS_SITEMAP } from "./public-discovery";

const root = resolve(import.meta.dirname, "..");
const app = readFileSync(resolve(root, "client/src/App.tsx"), "utf8");
const html = readFileSync(resolve(root, "client/index.html"), "utf8");
const marketing = readFileSync(
  resolve(root, "client/src/pages/PublicMarketingPage.tsx"),
  "utf8"
);
const metadata = readFileSync(
  resolve(root, "client/src/lib/publicMetadata.ts"),
  "utf8"
);

const expectedPaths = [
  "/",
  "/about",
  "/school-management-software",
  "/school-management-system-nigeria",
  "/for-schools",
  "/ai-for-schools",
  "/school-administration",
  "/student-management",
  "/academic-management",
  "/school-fees-management",
  "/school-attendance-management",
  "/school-results-management",
  "/parent-portal",
  "/school-communication",
  "/faq",
  "/contact",
];

describe("public NSOS visibility foundation", () => {
  it("keeps the approved public route set explicit and complete", () => {
    expect(PUBLIC_MARKETING_PATHS).toEqual(
      expect.arrayContaining(expectedPaths)
    );
    expect(PUBLIC_MARKETING_PATHS).toHaveLength(expectedPaths.length);
    for (const path of expectedPaths)
      expect(PUBLIC_MARKETING_PATHS).toContain(path);
  });

  it("routes NSOS-owned public domains without changing school or admissions routes", () => {
    expect(app).toContain("isNsosPublicDomain");
    expect(app).toContain("PublicLanding");
    expect(app).toContain('pathname.startsWith("/school/")');
    expect(app).toContain('pathname.startsWith("/apply/")');
    expect(app).toContain("DomainSchoolWebsite");
  });

  it("contains factual machine-readable identity and page metadata", () => {
    expect(html).toContain('name="description"');
    expect(html).toContain('rel="canonical"');
    expect(html).toContain('property="og:title"');
    expect(html).toContain('name="twitter:card"');
    expect(html).toContain("application/ld+json");
    expect(metadata).toContain('"@type": "Organization"');
    expect(metadata).toContain('"@type": "WebSite"');
    expect(metadata).toContain('"@type": "SoftwareApplication"');
    expect(metadata).toContain('"@type": "Service"');
    expect(metadata).toContain('"@type": "FAQPage"');
    expect(metadata).toContain('"@type": "BreadcrumbList"');
    expect(marketing).toContain("does not claim customer counts");
  });

  it("keeps discovery files canonical and excludes private application paths", () => {
    expect(NSOS_ROBOTS).toContain("Sitemap: https://nsos.top/sitemap.xml");
    expect(NSOS_ROBOTS).toContain("Disallow: /api/");
    expect(NSOS_ROBOTS).toContain("Disallow: /settings");
    expect(NSOS_SITEMAP).toContain("https://nsos.top/faq");
    expect(NSOS_SITEMAP).not.toContain("/api/");
    expect(NSOS_LLMS).toContain("https://nsos.top/");
    expect(NSOS_LLMS).toContain("Do not infer customer counts");
  });
});

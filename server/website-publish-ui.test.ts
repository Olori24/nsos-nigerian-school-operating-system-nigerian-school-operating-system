import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const app = readFileSync(resolve(root, "client/src/App.tsx"), "utf8");
const platformHost = readFileSync(
  resolve(root, "client/src/lib/platformHost.ts"),
  "utf8"
);
const studio = readFileSync(
  resolve(root, "client/src/components/WebsiteStudio.tsx"),
  "utf8"
);
const theme = readFileSync(
  resolve(root, "client/src/contexts/ThemeContext.tsx"),
  "utf8"
);
const css = readFileSync(resolve(root, "client/src/index.css"), "utf8");

describe("school website publishing and theme presentation", () => {
  it("routes verified custom-domain visitors through the public domain resolver", () => {
    expect(app).toMatch(
      /const DomainSchoolWebsite = lazy\(\(\) => import\("\.\/pages\/DomainSchoolWebsite"\)\)/
    );
    expect(app).toContain("isNsosPlatformHost");
    expect(app).toContain("<DomainSchoolWebsite />");
  });

  it("keeps NSOS-owned custom domains in the product router instead of treating them as tenant school domains", () => {
    expect(app).toContain("isNsosPlatformHost");
    expect(platformHost).toContain(
      'const NSOS_PLATFORM_CUSTOM_DOMAINS = new Set(["nsos.top", "www.nsos.top"])'
    );
    expect(platformHost).toContain("NSOS_PLATFORM_CUSTOM_DOMAINS.has(host)");
  });

  it("shows an NSOS-branded school route instead of the managed deployment host and preserves active custom domains", () => {
    expect(platformHost).toContain(
      'const NSOS_PLATFORM_PUBLIC_ORIGIN = "https://nsos.top"'
    );
    expect(platformHost).toContain(
      "export function nsosSchoolPublicUrl(shortCode: string)"
    );
    expect(studio).toContain(
      'import { nsosSchoolPublicUrl } from "@/lib/platformHost"'
    );
    expect(studio).toContain("return nsosSchoolPublicUrl(school.shortCode)");
    expect(studio).toContain(
      'website.customDomain && website.domainStatus === "active"'
    );
    expect(studio).toContain("NSOS public link");
    expect(studio).toContain("href={publicPath}");
    expect(studio).not.toContain("window.location.origin}/school/");
  });

  it("provides explicit publish and unpublish actions while keeping custom domains optional", () => {
    expect(studio).toContain("Publish website");
    expect(studio).toContain("Unpublish website");
    expect(studio).toContain("Publishing does not require a custom domain.");
    expect(studio).toContain(
      "Publishing immediately activates the school’s NSOS public link."
    );
  });

  it("scopes dark mode to the NSOS application and includes website-specific high-contrast treatment", () => {
    expect(theme).toContain("nsos-theme-scope");
    expect(theme).not.toContain("document.documentElement");
    expect(css).toContain(".dark .school-website-studio");
    expect(css).toContain(".dark .school-public-site");
  });
});

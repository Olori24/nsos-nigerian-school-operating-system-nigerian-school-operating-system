import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const home = readFileSync(resolve(root, "client/src/pages/Home.tsx"), "utf8");
const app = readFileSync(resolve(root, "client/src/App.tsx"), "utf8");
const logoComponent = readFileSync(
  resolve(root, "client/src/components/NSOSLogo.tsx"),
  "utf8"
);
const publicMarketing = readFileSync(
  resolve(root, "client/src/pages/PublicMarketingPage.tsx"),
  "utf8"
);
const html = readFileSync(resolve(root, "client/index.html"), "utf8");
const mark = readFileSync(
  resolve(root, "client/public/icons/nsos-mark.svg"),
  "utf8"
);
const logo = readFileSync(
  resolve(root, "client/public/icons/nsos-logo.svg"),
  "utf8"
);
const inverseLogo = readFileSync(
  resolve(root, "client/public/icons/nsos-logo-inverse.svg"),
  "utf8"
);

describe("NSOS brand asset wiring", () => {
  it("uses light and inverse wordmarks in the shared Brand component", () => {
    expect(home).toContain("<NSOSLogo forceInverse={inverse || undefined} />");
    expect(logoComponent).toContain('"/icons/nsos-logo-inverse.svg"');
    expect(logoComponent).toContain('"/icons/nsos-logo.svg"');
    expect(logoComponent).toContain(
      'alt="NSOS — Nigerian School Operating System"'
    );
  });

  it("provides distinct scalable mark and wordmark assets", () => {
    for (const asset of [mark, logo, inverseLogo]) {
      expect(asset).toContain("<svg");
      expect(asset).toContain("NSOS");
      expect(asset).toContain("#0f5c4f");
    }
    expect(inverseLogo).toContain("#fffdf7");
    expect(logo).toContain("NIGERIAN SCHOOL OS");
  });

  it("wires the custom SVG mark into the browser shell", () => {
    expect(html).toContain('type="image/svg+xml"');
    expect(html).toContain('href="/icons/nsos-mark.svg"');
    expect(html).toContain('href="/icons/nsos-icon-32.png"');
  });

  it("uses the wordmark on public marketing surfaces", () => {
    expect(publicMarketing).toContain(
      '<NSOSLogo className="h-10 max-w-[190px]" />'
    );
    expect(logoComponent).toContain(
      'alt="NSOS — Nigerian School Operating System"'
    );
  });

  it("keeps the theme toggle available on public and authenticated routes", () => {
    expect(app).toContain('<ThemeProvider defaultTheme="light" switchable>');
    expect(app).toContain("<BiodataThemeToggle />");
    expect(app).not.toContain("if (isPublicEntry && !user) return null");
  });
});

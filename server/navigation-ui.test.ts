import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const home = readFileSync(resolve(root, "client/src/pages/Home.tsx"), "utf8");
const publicMarketing = readFileSync(
  resolve(root, "client/src/pages/PublicMarketingPage.tsx"),
  "utf8"
);
const dashboard = readFileSync(
  resolve(root, "client/src/components/DashboardLayout.tsx"),
  "utf8"
);

describe("responsive navigation presentation", () => {
  it("keeps the authenticated school and admin sidebar active state explicit", () => {
    expect(home).toContain('aria-current={active ? "page" : undefined}');
    expect(home).toContain("bg-[#b8dfc3]");
    expect(home).toContain("hover:translate-x-0.5");
    expect(home).toContain("focus-visible:ring-offset-[#10231f]");
  });

  it("adds active-page semantics and restrained motion to public navigation", () => {
    expect(publicMarketing).toContain("activePath");
    expect(publicMarketing).toContain(
      'aria-current={active ? "page" : undefined}'
    );
    expect(publicMarketing).toContain("hover:-translate-y-0.5");
    expect(publicMarketing).toContain("focus-visible:ring-2");
    expect(publicMarketing).toContain(
      'page.path === path ? "page" : undefined'
    );
  });

  it("keeps the generic admin dashboard navigation keyboard-visible and active-aware", () => {
    expect(dashboard).toContain('aria-current={isActive ? "page" : undefined}');
    expect(dashboard).toContain("hover:translate-x-0.5");
    expect(dashboard).toContain("focus-visible:ring-2 focus-visible:ring-ring");
    expect(dashboard).toContain("shadow-[inset_2px_0_0_var(--primary)]");
  });
});

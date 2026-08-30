import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const home = readFileSync(
  new URL("../client/src/pages/Home.tsx", import.meta.url),
  "utf8"
);

describe("Quick Start dashboard presentation", () => {
  it("appears in the live management overview with direct one-click navigation into real workspaces", () => {
    expect(home).toMatch(/<QuickStartDashboard\s+role=\{role === "owner" \? "owner" : "admin"\}\s+onNavigate=\{onNavigate\}\s*\/>/);
    expect(home).toMatch(/The most-used tools, ready in one click\. Each action opens the real\s+NSOS workspace\./);
    expect(home).toContain('view: "admissions"');
    expect(home).toContain('view: "students"');
    expect(home).toContain('view: "attendance"');
    expect(home).toContain('view: "finance"');
    expect(home).toContain('view: "communications"');
    expect(home).toContain("onClick={() => onNavigate(action.view)}");
  });

  it("keeps welcome-email quick links on existing same-origin workspace views", () => {
    expect(home).toContain(
      'const requestedView = url.searchParams.get("view") as View | null;'
    );
    expect(home).toContain(
      "if (!requestedView || !accessibleViews.has(requestedView)) return;"
    );
    expect(home).toContain('url.searchParams.delete("view")');
    expect(home).toContain('view: "communications"');
  });

  it("offers owner-only automation while preserving role-aware real-workflow boundaries", () => {
    expect(home).toMatch(/role === "owner"\s*\?\s*\[/);
    expect(home).toContain('label: "Run a setup job"');
    expect(home).toContain('view: "automation" as const');
    expect(home).toContain("Owner shortcuts");
    expect(home).toContain("Administrator shortcuts");
    expect(home).not.toContain("Quick Start completed all setup automatically");
  });
});

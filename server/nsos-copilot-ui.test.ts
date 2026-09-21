import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const copilot = readFileSync(
  resolve(root, "client/src/components/NsosCopilot.tsx"),
  "utf8"
);

describe("NSOS guide trigger presentation", () => {
  it("uses NSOS-native guide branding on the floating workspace entry point", () => {
    expect(copilot).toContain('aria-label="Open NSOS Guide"');
    expect(copilot).toContain('title="Open NSOS Guide (Ctrl/⌘ K)"');
    expect(copilot).toContain(
      '<span className="hidden sm:inline">Guide</span>'
    );
    expect(copilot).not.toContain('aria-label="Open NSOS Institution Copilot"');
    expect(copilot).not.toContain(">Copilot</span>");
  });

  it("keeps the review-first safety boundary visible in the guide dialog", () => {
    expect(copilot).toContain("NSOS Guide");
    expect(copilot).toMatch(/human\s+review\s+and\s+confirmation/);
    expect(copilot).toContain("Review first");
    expect(copilot).toMatch(/NSOS will prepare a role-safe next step/);
  });
});

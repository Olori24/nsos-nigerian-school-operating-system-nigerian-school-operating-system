import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");

describe("README approval-first School Operator release documentation", () => {
  it("links the operating model and documents explainable aggregate insight boundaries", () => {
    expect(readme).toContain("[AI School Operator](docs/ai-school-operator-operating-model.md)");
    expect(readme).toContain("tenant-scoped operating readiness");
    expect(readme).toContain("deterministic server-side aggregation supplies School Operator signals");
    expect(readme).toContain("does not use background loops, timers, or unreviewed external activity");
  });

  it("describes learner-owned next-step guidance without overstating academic or operational authority", () => {
    expect(readme).toContain("Student Learning Copilot");
    expect(readme).toContain("only on their own linked active programme context");
    expect(readme).toContain("never changes a programme, progress, assessment, result, completion state, or private issuer record");
    expect(readme).toContain("or change providers, domains, or DNS");
  });

  it("records the latest validation count and the unchanged external sender dependency", () => {
    expect(readme).toContain("377/378 passing tests across 104/105 files");
    expect(readme).toContain("currently unverified `resend.dev` sender");
    expect(readme).toContain("`nsos.top` is active at its registrar but is not bound to the managed deployment");
  });
});

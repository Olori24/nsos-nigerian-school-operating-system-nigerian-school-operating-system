import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const home = readFileSync(resolve(import.meta.dirname, "../client/src/pages/Home.tsx"), "utf8");

describe("Operations Command Center presentation", () => {
  it("appears only in the management overview and links to existing protected workspaces", () => {
    expect(home).toContain("<OperationsCommandCenter schoolId={schoolId} onNavigate={onNavigate} />");
    expect(home).toContain("trpc.nsos.operations.commandCenter.useQuery({ schoolId })");
    expect(home).toContain("Recommended next action");
    expect(home).toContain("Approved data migrations");
    expect(home).toContain("Communication readiness");
    expect(home).toContain("normal confirmation controls still apply");
  });
});

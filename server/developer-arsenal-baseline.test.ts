import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function readProjectFile(relativePath: string) {
  return readFileSync(resolve(root, relativePath), "utf8");
}

describe("Developer Arsenal baseline", () => {
  it("keeps the static audit and policy artifacts available to CI", () => {
    const packageJson = JSON.parse(readProjectFile("package.json")) as {
      scripts?: Record<string, string>;
      packageManager?: string;
    };

    expect(packageJson.scripts?.["arsenal:audit"]).toBe(
      "node scripts/arsenal-audit.mjs"
    );
    expect(packageJson.packageManager).toMatch(/^pnpm@/);

    for (const relativePath of [
      "scripts/arsenal-audit.mjs",
      "docs/DEVELOPER_ARSENAL.md",
      "docs/AI_ENGINEERING_STANDARD.md",
      "docs/AUTOMATION_ENGINEERING_STANDARD.md",
      "docs/CLIENT_DELIVERY_STANDARD.md",
      "docs/PROVIDER_ADAPTER_STANDARD.md",
      "docs/RECOVERY_RUNBOOK.md",
    ]) {
      expect(existsSync(resolve(root, relativePath))).toBe(true);
    }
  });

  it("uses current security action majors and keeps the health workload manual", () => {
    const ci = readProjectFile(".github/workflows/ci.yml");
    const security = readProjectFile(".github/workflows/security.yml");
    const performance = readProjectFile(".github/workflows/performance.yml");

    expect(ci).toContain("pnpm arsenal:audit");
    expect(security).toContain("github/codeql-action/init@v4");
    expect(security).toContain("actions/dependency-review-action@v5");
    expect(security).toContain("gitleaks/gitleaks-action@v3");
    expect(performance).toContain("workflow_dispatch:");
    expect(performance).toContain("if: inputs.approved == true");
    expect(performance).toContain("node scripts/measure-health-load.mjs");
  });
});

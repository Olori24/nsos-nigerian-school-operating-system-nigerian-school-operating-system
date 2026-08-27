import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workflowPath = resolve(import.meta.dirname, "../.github/workflows/ci.yml");

describe("continuous-integration validation gates", () => {
  it("runs locked-install, audit, formatting, static analysis, migration, deterministic tests, and build checks", () => {
    const workflow = readFileSync(workflowPath, "utf8");

    expect(workflow).toContain("pnpm install --frozen-lockfile");
    expect(workflow).toContain("pnpm audit --prod");
    expect(workflow).toContain("pnpm lint");
    expect(workflow).toContain("pnpm format:check");
    expect(workflow).toContain("pnpm check");
    expect(workflow).toContain("pnpm drizzle-kit migrate");
    expect(workflow).toContain("pnpm test");
    expect(workflow).toContain("pnpm build");
  });

  it("keeps live sender-domain health out of the default CI path", () => {
    const workflow = readFileSync(workflowPath, "utf8");

    expect(workflow).toContain('RUN_LIVE_PROVIDER_TESTS: "false"');
    expect(workflow).not.toContain("RESEND_API_KEY");
  });
});

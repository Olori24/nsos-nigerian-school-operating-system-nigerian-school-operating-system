import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const app = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
const home = readFileSync(
  resolve(process.cwd(), "client/src/pages/Home.tsx"),
  "utf8"
).replace(/\s+/g, " ");

describe("affiliate pilot stable dashboard entry", () => {
  it("does not register a deep route that the deployed host cannot serve", () => {
    expect(app).not.toContain('path="/platform/affiliate-pilot"');
  });

  it("opens the existing owner-only console from the stable root dashboard query", () => {
    expect(home).toContain(
      'url.searchParams.get("open") !== "affiliate-pilot"'
    );
    expect(home).toContain("onClick={() => setAffiliatePilotOpen(true)}");
    expect(home).toContain(
      'if (!platformAdmin || typeof window === "undefined") return;'
    );
    expect(home).toContain("<AffiliatePilotConsole open={affiliatePilotOpen}");
  });
});

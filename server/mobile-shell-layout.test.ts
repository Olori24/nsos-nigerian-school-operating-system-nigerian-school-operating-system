import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const home = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");

describe("NSOS mobile setup shell", () => {
  it("keeps the account-security action compact beside the brand mark", () => {
    expect(home).toContain('gap-3 border-b border-[#e4e9e3]');
    expect(home).toContain('shrink-0 whitespace-nowrap rounded-lg border border-[#d6e4da]');
  });
});

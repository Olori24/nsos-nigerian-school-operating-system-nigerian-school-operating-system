import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const panel = readFileSync(resolve(process.cwd(), "client/src/components/AffiliatePilotConsole.tsx"), "utf8");

describe("affiliate pilot mobile record action", () => {
  it("keeps a visible header action that opens the existing explicit confirmation dialog", () => {
    expect(panel).toContain('aria-label="Record approved affiliate defaults"');
    expect(panel).toContain('aria-controls="affiliate-defaults-confirmation"');
    expect(panel).toContain('onClick={() => setConfirmationOpen(true)}');
    expect(panel).toContain("Record approved affiliate pilot defaults?");
  });

  it("retains the protected confirmation mutation and no-activation disclosure", () => {
    expect(panel).toContain("confirmDefaults.mutate({ confirmed: true })");
    expect(panel).not.toContain("AlertDialog");
    expect(panel).toContain("It does not enrol an affiliate, issue a link, publish a term, create a referral, contact anyone, or approve a payout.");
  });
});

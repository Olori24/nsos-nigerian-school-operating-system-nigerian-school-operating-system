import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const component = readFileSync(
  resolve(process.cwd(), "client/src/components/AffiliatePilotConsole.tsx"),
  "utf8"
);
const readinessBoard = readFileSync(
  resolve(
    process.cwd(),
    "client/src/components/AffiliateLaunchReadinessBoard.tsx"
  ),
  "utf8"
);
const home = readFileSync(
  resolve(process.cwd(), "client/src/pages/Home.tsx"),
  "utf8"
).replace(/\s+/g, " ");

describe("affiliate pilot internal-review UI", () => {
  it("shows the agreed defaults and makes their persistence explicitly confirmable", () => {
    expect(component).toContain("20% of a first verified payment");
    expect(component).toContain("Attribution window");
    expect(component).toContain("Refund / chargeback hold");
    expect(component).toContain("Minimum payout");
    expect(component).toContain("Record approved defaults");
    expect(component).toContain("confirmDefaults.mutate({ confirmed: true })");
  });

  it("keeps partner, referral, public marketing, provider, and payout activation out of the console", () => {
    expect(component).toContain(
      "does not enrol creators, issue referral links, publish terms, send outreach, track real referrals, or pay commissions"
    );
    expect(component).toContain("Activation remains blocked");
    expect(component).not.toContain("Create affiliate");
    expect(component).not.toContain("Issue referral link");
    expect(component).not.toContain("Pay commission");
  });

  it("shows an owner-only readiness path without an activation action", () => {
    expect(component).toContain("AffiliateLaunchReadinessBoard");
    expect(readinessBoard).toContain("Approval-first launch path");
    expect(readinessBoard).toContain("External activity remains inactive");
    expect(readinessBoard).toContain("Owner decision required");
    expect(readinessBoard).not.toContain("Activate partner");
    expect(readinessBoard).not.toContain("Create referral link");
    expect(readinessBoard).not.toContain("Pay affiliate");
  });

  it("mounts the console only within the existing platform-admin dashboard boundary", () => {
    expect(home).toContain("platformAdmin &&");
    expect(home).toContain("<AffiliatePilotConsole");
    expect(home).toContain("setAffiliatePilotOpen(true)");
  });
});

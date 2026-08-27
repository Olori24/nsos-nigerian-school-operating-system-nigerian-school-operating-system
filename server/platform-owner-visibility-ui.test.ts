import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const home = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");

describe("platform owner control visibility", () => {
  it("uses the server-confirmed owner-access result rather than the broad global-admin UI role", () => {
    expect(home).toContain("trpc.nsos.platform.ownerAccess.useQuery");
    expect(home).toContain("const platformAdmin = platformOwnerQuery.data?.isPlatformOwner === true;");
    expect(home).not.toContain("const platformAdmin = user.role === \"admin\";");
  });

  it("keeps the affiliate control nested within the server-confirmed platform-owner visibility condition", () => {
    expect(home).toContain("{platformAdmin && <><button onClick={() => setAffiliatePilotOpen(true)}");
    expect(home).toContain("{platformAdmin && <AffiliatePilotConsole");
  });

  it("provides a labelled mobile affiliate entry instead of hiding every platform control below the small breakpoint", () => {
    expect(home).toContain('bg-[#fff9ea] px-5 py-2 sm:hidden');
    expect(home).toContain('aria-label="Open Affiliate pilot"');
  });

  it("offers a clear, confirmation-gated recovery control only when the protected route reports verified claim eligibility", () => {
    expect(home).toContain("const canClaimOwnerAccess = platformOwnerQuery.data?.canClaimOwnerAccess === true;");
    expect(home).toContain("{canClaimOwnerAccess && <section");
    expect(home).toContain("Restore platform-owner access for this verified Google sign-in?");
    expect(home).toContain("claimOwnerAccess.mutate({ confirmed: true })");
  });
});

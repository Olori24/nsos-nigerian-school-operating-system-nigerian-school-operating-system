import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("parent trust centre UI wiring", () => {
  const home = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");
  const component = readFileSync(resolve(process.cwd(), "client/src/components/ParentTrustCentre.tsx"), "utf8");

  it("loads family-scoped payment evidence notifications", () => {
    expect(home).toContain("trpc.nsos.portal.paymentEvidenceNotifications.useQuery");
    expect(home).toContain('enabled: !!schoolId && role === "parent"');
  });

  it("renders the trust centre only for parent accounts", () => {
    expect(home).toContain('<ParentTrustCentre data={guardian.data} paymentEvidenceNotifications={paymentEvidenceNotifications} />');
  });

  it("labels the surface as an evidence-backed trust timeline", () => {
    expect(component).toContain("Parent Trust Centre");
    expect(component).toContain("Only information already permitted to this portal is shown.");
    expect(component).toContain("published school updates");
    expect(component).toContain("payment-evidence decisions");
  });
});

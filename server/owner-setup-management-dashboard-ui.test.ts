import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dashboard = readFileSync(new URL("../client/src/components/OwnerSetupManagementDashboard.tsx", import.meta.url), "utf8");
const home = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");

describe("owner setup management dashboard", () => {
  it("keeps setup approvals in an owner-only workspace route", () => {
    expect(home).toContain('id: "setup-management", label: "Setup approvals", icon: ShieldCheck, roles: ["owner"]');
    expect(home).toContain('if (view === "setup-management") return role === "owner" ? <OwnerSetupManagementDashboard schoolId={schoolId} />');
  });

  it("shows both pending queues and retains explicit confirmation for each sensitive action", () => {
    expect(dashboard).toContain("Staff invitation queue");
    expect(dashboard).toContain("Inactive fee drafts");
    expect(dashboard).toContain("I approve sending this invitation to the named school email.");
    expect(dashboard).toContain("I give final owner approval to activate this fee structure.");
    expect(dashboard).toContain("sendStaffInvitation");
    expect(dashboard).toContain("activateFinanceDraft");
  });

  it("does not imply automatic invitation delivery or finance activation", () => {
    expect(dashboard).toContain("does not create invoices or record a payment");
    expect(dashboard).toContain("This dashboard never invents staff identities");
    expect(dashboard).toContain("must be confirmed in place");
  });
});

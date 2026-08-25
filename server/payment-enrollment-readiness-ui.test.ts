import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const home = readFileSync(resolve(root, "client/src/pages/Home.tsx"), "utf8");
const readiness = readFileSync(resolve(root, "client/src/components/PaymentEnrollmentReadiness.tsx"), "utf8");

describe("payment integration and enrollment readiness interface", () => {
  it("mounts the owner/admin evidence panel in the active Builder-first overview", () => {
    expect(home).toContain('import { PaymentEnrollmentReadiness } from "@/components/PaymentEnrollmentReadiness";');
    expect(home).toContain('<PaymentEnrollmentReadiness schoolId={schoolId} onNavigate={onNavigate} />');
    expect(home).toContain('role: "owner" | "admin"');
  });

  it("uses only existing protected evidence queries and provides finance and admissions handoffs", () => {
    expect(readiness).toContain("trpc.nsos.providers.list.useQuery({ schoolId })");
    expect(readiness).toContain("trpc.nsos.cashAssurance.list.useQuery({ schoolId })");
    expect(readiness).toContain("trpc.nsos.admissions.list.useQuery({ schoolId, limit: 100 })");
    expect(readiness).toContain('onNavigate("finance")');
    expect(readiness).toContain('onNavigate("admissions")');
    expect(readiness).not.toContain("useMutation");
  });

  it("states the provider-evidence and no-auto-enrollment boundaries explicitly", () => {
    expect(readiness).toContain("Provider verification evidence");
    expect(readiness).toContain("Payment-evidence review");
    expect(readiness).toContain("Enrollment remains a separate approval");
    expect(readiness).toContain("does not create a learner, alter an application, assign a class, send an admission letter, or confirm enrollment from this panel");
    expect(readiness).toContain("cannot save merchant credentials, run a provider test, collect or record a payment, approve payment evidence, accept an applicant, enroll a learner, issue a receipt, or send an admission letter");
  });
});

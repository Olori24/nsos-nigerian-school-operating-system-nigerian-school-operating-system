import { describe, expect, it } from "vitest";
import { deriveAcademyLaunchReadiness } from "./db";

const completeInternalFoundation = { profileConfigured: true, programCount: 2, moduleCount: 8, materialCount: 12, activeTutorCount: 1, websitePublished: true, admissionsEnabled: true, paymentProviderReady: true, emailSenderNeedsVerification: false, emailFailedCount: 0, activeCertificationPolicyCount: 1 };

describe("academy launch readiness", () => {
  it("fails closed for missing learning, payment, sender, certificate, and staging evidence", () => {
    const result = deriveAcademyLaunchReadiness({ profileConfigured: false, programCount: 0, moduleCount: 0, materialCount: 0, activeTutorCount: 0, websitePublished: false, admissionsEnabled: false, paymentProviderReady: false, emailSenderNeedsVerification: true, emailFailedCount: 0, activeCertificationPolicyCount: 0 });
    expect(result.status).toBe("blocked");
    expect(result.checks.find(check => check.id === "payment-readiness")).toMatchObject({ status: "blocked", destination: "finance" });
    expect(result.checks.find(check => check.id === "email-readiness")).toMatchObject({ status: "blocked", destination: "communications" });
    expect(result.checks.find(check => check.id === "staging-and-recovery")).toMatchObject({ status: "blocked" });
  });

  it("reports configured internal evidence without converting it into a broad launch approval", () => {
    const result = deriveAcademyLaunchReadiness(completeInternalFoundation);
    expect(result.checks.find(check => check.id === "learning-foundation")?.status).toBe("ready");
    expect(result.checks.find(check => check.id === "supervised-tutors")?.status).toBe("ready");
    expect(result.checks.find(check => check.id === "private-certificate-policy")?.status).toBe("warning");
    expect(result.status).toBe("blocked");
  });
});

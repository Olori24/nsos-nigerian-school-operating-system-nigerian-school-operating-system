import { describe, expect, it } from "vitest";
import { shouldShowTenantOnboardingCelebration, tenantOnboardingCelebrationStorageKey } from "../client/src/lib/tenantOnboardingCelebration";

describe("tenant onboarding completion celebration", () => {
  it("appears only when all real onboarding steps are complete and has not been dismissed", () => {
    expect(shouldShowTenantOnboardingCelebration(100, false)).toBe(true);
    expect(shouldShowTenantOnboardingCelebration(83, false)).toBe(false);
    expect(shouldShowTenantOnboardingCelebration(100, true)).toBe(false);
  });

  it("uses a tenant-scoped storage key so dismissing one school does not affect another", () => {
    expect(tenantOnboardingCelebrationStorageKey(14)).toBe("nsos:tenant-onboarding-complete:14:dismissed");
    expect(tenantOnboardingCelebrationStorageKey(14)).not.toBe(tenantOnboardingCelebrationStorageKey(15));
  });
});

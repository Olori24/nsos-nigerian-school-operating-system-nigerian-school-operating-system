import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const checklist = readFileSync(new URL("../client/src/components/GuardianPortalOnboardingChecklist.tsx", import.meta.url), "utf8");
const home = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");

describe("guardian portal onboarding checklist interface", () => {
  it("guides verified guardians through profile, learner, fee, and noticeboard first steps", () => {
    expect(checklist).toContain("First steps in your guardian portal");
    expect(checklist).toContain("Review your guardian profile");
    expect(checklist).toContain("View your linked learners");
    expect(checklist).toContain("Check fees and payment evidence");
    expect(checklist).toContain("Read school updates");
  });

  it("derives progress from existing scoped portal data without mutations", () => {
    expect(checklist).toContain("guardianPortalOnboardingSteps");
    expect(checklist).toContain("It never writes to school, student, guardian, invoice, or announcement records.");
    expect(checklist).not.toContain("useMutation");
    expect(checklist).not.toContain("trpc.");
  });

  it("renders the checklist only for the parent portal role", () => {
    expect(home).toContain('role === "parent" && <GuardianPortalOnboardingChecklist');
  });
});

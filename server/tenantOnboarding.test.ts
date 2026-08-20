import { describe, expect, it } from "vitest";
import { deriveTenantOnboardingStatus } from "./tenantOnboarding";

const readySignals = {
  schoolProfileReady: true,
  sessions: 1,
  terms: 3,
  classes: 8,
  subjects: 12,
  activeStaff: 4,
  activeStudents: 80,
  feeStructures: 6,
  websitePublished: true,
};

describe("tenant onboarding progress", () => {
  it("marks every tenant milestone complete only when its authentic supporting records exist", () => {
    const status = deriveTenantOnboardingStatus(readySignals);
    expect(status).toMatchObject({ completedSteps: 6, totalSteps: 6, completionPercent: 100, nextStep: null });
    expect(status.steps.every(step => step.completed)).toBe(true);
  });

  it("keeps the academic foundation incomplete until session, term, class, and subject records all exist", () => {
    const status = deriveTenantOnboardingStatus({ ...readySignals, subjects: 0, activeStaff: 0, activeStudents: 0, feeStructures: 0, websitePublished: false });
    expect(status.completedSteps).toBe(1);
    expect(status.nextStep).toMatchObject({ id: "academic-foundation", destination: "academics", actionLabel: "Set up academics" });
  });

  it("points the school administrator to the first unfinished actionable setup area", () => {
    const status = deriveTenantOnboardingStatus({ ...readySignals, activeStaff: 0, activeStudents: 0, feeStructures: 0, websitePublished: false });
    expect(status.nextStep).toMatchObject({ id: "team", destination: "staff", actionLabel: "Add staff" });
    expect(status.completionPercent).toBe(33);
  });
});

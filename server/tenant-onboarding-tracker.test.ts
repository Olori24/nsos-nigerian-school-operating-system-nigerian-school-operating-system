import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const tracker = readFileSync(resolve(root, "client/src/components/TenantOnboardingTracker.tsx"), "utf8");
const home = readFileSync(resolve(root, "client/src/pages/Home.tsx"), "utf8");
const router = readFileSync(resolve(root, "server/routers/nsos.ts"), "utf8");

describe("tenant onboarding tracker wiring", () => {
  it("uses a dedicated owner/admin onboarding-status query and a real completion progress bar", () => {
    expect(router).toContain("onboarding: router({");
    expect(router).toContain("status: onboardingAdminProcedure");
    expect(tracker).toContain("trpc.nsos.onboarding.status.useQuery({ schoolId })");
    expect(tracker).toContain("aria-label=\"Tenant onboarding completion\"");
    expect(tracker).toContain("Progress reflects real school records.");
  });

  it("provides the next setup action and connected workspace routes instead of inert onboarding controls", () => {
    expect(tracker).toContain("Next recommended action");
    expect(tracker).toContain("onNavigate(next.destination!)");
    expect(tracker).toContain("onNavigate(step.destination!)");
    expect(home).toContain("<TenantOnboardingTracker schoolId={schoolId} onNavigate={onNavigate} />");
  });

  it("shows a dismissible, reduced-motion-safe celebration only for a fully completed tenant setup", () => {
    expect(tracker).toContain("shouldShowTenantOnboardingCelebration(data.completionPercent, celebrationDismissed)");
    expect(tracker).toContain('data-onboarding-completion-celebration');
    expect(tracker).toContain('aria-label="Dismiss setup completion celebration"');
    expect(tracker).toContain("tenantOnboardingCelebrationStorageKey(schoolId)");
    expect(tracker).toContain("const celebrationConfetti");
    expect(tracker).toContain("data-confetti-piece={index + 1}");
    const styles = readFileSync(resolve(root, "client/src/index.css"), "utf8");
    expect(styles).toContain("@media (prefers-reduced-motion: no-preference)");
    expect(styles).toContain(".onboarding-completion-celebration");
    expect(styles).toContain("onboarding-completion-confetti-fall");
  });
});

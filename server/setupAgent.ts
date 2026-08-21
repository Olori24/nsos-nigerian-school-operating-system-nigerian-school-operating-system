import type { TenantOnboardingStep } from "./tenantOnboarding";

export type SetupAgentAction = {
  id: "academic_foundation" | "team" | "learners" | "finance" | "public_presence";
  label: string;
  description: string;
  state: "complete" | "ready" | "needs_school_input";
  executable: boolean;
  destination: "academics" | "staff" | "students" | "finance" | "website";
  safeguards: string[];
};

export function buildSetupAgentAssessment(onboarding: {
  completionPercent: number;
  completedSteps: number;
  totalSteps: number;
  steps: TenantOnboardingStep[];
}) {
  const byId = new Map(onboarding.steps.map(step => [step.id, step]));
  const academic = byId.get("academic-foundation")!;
  const team = byId.get("team")!;
  const learners = byId.get("learners")!;
  const fees = byId.get("fees")!;
  const website = byId.get("public-presence")!;
  const action = (id: SetupAgentAction["id"], step: TenantOnboardingStep, executable: boolean, safeguards: string[]): SetupAgentAction => ({
    id,
    label: step.label,
    description: step.description,
    state: step.completed ? "complete" : executable ? "ready" : "needs_school_input",
    executable: !step.completed && executable,
    destination: step.destination!,
    safeguards,
  });

  return {
    completionPercent: onboarding.completionPercent,
    completedSteps: onboarding.completedSteps,
    totalSteps: onboarding.totalSteps,
    actions: [
      action("academic_foundation", academic, true, ["Uses only the session, term, real class names, and reviewed curriculum template you approve.", "Never creates learners, staff identities, payment accounts, provider credentials, or published content."]),
      action("team", team, true, ["Uses only the real name, email, employee number, role, and employment details the school approves. An invitation is never sent without a second explicit confirmation."]),
      action("learners", learners, false, ["A school must provide authorised learner and guardian data; the agent never invents records."]),
      action("finance", fees, true, ["Creates fee structures as inactive drafts only. A separate school-approved activation is required before any fee structure becomes active."]),
      action("public_presence", website, false, ["School-owned website content, contact details, images, and publication must be reviewed before public release."]),
    ],
  };
}

export type OnboardingDestination = "academics" | "staff" | "students" | "finance" | "website";

export type TenantOnboardingSignals = {
  schoolProfileReady: boolean;
  sessions: number;
  terms: number;
  classes: number;
  subjects: number;
  activeStaff: number;
  activeStudents: number;
  feeStructures: number;
  websitePublished: boolean;
};

export type TenantOnboardingStep = {
  id: "school-profile" | "academic-foundation" | "team" | "learners" | "fees" | "public-presence";
  label: string;
  description: string;
  completed: boolean;
  destination?: OnboardingDestination;
  actionLabel?: string;
};

export function deriveTenantOnboardingStatus(signals: TenantOnboardingSignals) {
  const steps: TenantOnboardingStep[] = [
    {
      id: "school-profile",
      label: "School profile",
      description: "Your school name, code, and Nigerian state are recorded.",
      completed: signals.schoolProfileReady,
    },
    {
      id: "academic-foundation",
      label: "Academic foundation",
      description: "Create a session, term, class, and subject before enrolling learners.",
      completed: signals.sessions > 0 && signals.terms > 0 && signals.classes > 0 && signals.subjects > 0,
      destination: "academics",
      actionLabel: "Set up academics",
    },
    {
      id: "team",
      label: "First team member",
      description: "Add at least one active staff record for your school team.",
      completed: signals.activeStaff > 0,
      destination: "staff",
      actionLabel: "Add staff",
    },
    {
      id: "learners",
      label: "First learner",
      description: "Create a student record after the academic foundation is in place.",
      completed: signals.activeStudents > 0,
      destination: "students",
      actionLabel: "Add learner",
    },
    {
      id: "fees",
      label: "Fee structure",
      description: "Add at least one fee item to begin preparing family balances and receipts.",
      completed: signals.feeStructures > 0,
      destination: "finance",
      actionLabel: "Set up fees",
    },
    {
      id: "public-presence",
      label: "School website",
      description: "Publish your school website when you are ready to welcome prospective families.",
      completed: signals.websitePublished,
      destination: "website",
      actionLabel: "Prepare website",
    },
  ];

  const completedSteps = steps.filter(step => step.completed).length;
  const nextStep = steps.find(step => !step.completed) ?? null;
  return {
    steps,
    totalSteps: steps.length,
    completedSteps,
    completionPercent: Math.round((completedSteps / steps.length) * 100),
    nextStep,
  };
}

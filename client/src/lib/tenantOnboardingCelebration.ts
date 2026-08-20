export function tenantOnboardingCelebrationStorageKey(schoolId: number) {
  return `nsos:tenant-onboarding-complete:${schoolId}:dismissed`;
}

export function shouldShowTenantOnboardingCelebration(completionPercent: number | undefined, dismissed: boolean) {
  return completionPercent === 100 && !dismissed;
}

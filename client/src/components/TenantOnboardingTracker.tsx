import { useEffect, useState } from "react";
import { ArrowUpRight, Check, CircleDashed, PartyPopper, Sparkles, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { shouldShowTenantOnboardingCelebration, tenantOnboardingCelebrationStorageKey } from "@/lib/tenantOnboardingCelebration";
import { trpc } from "@/lib/trpc";
import type { OnboardingDestination } from "../../../server/tenantOnboarding";

type Props = {
  schoolId: number;
  onNavigate: (destination: OnboardingDestination) => void;
};

const celebrationConfetti = [
  "left-[5%] top-3 h-2 w-2 rounded-sm bg-[#c89135]",
  "left-[13%] top-10 h-1.5 w-1.5 rounded-full bg-[#4e9b72]",
  "left-[23%] top-4 h-2.5 w-1 rounded-full bg-[#d58762]",
  "left-[33%] top-9 h-1.5 w-2 rounded-sm bg-[#7aa9bd]",
  "left-[43%] top-2 h-2 w-2 rounded-full bg-[#c89135]",
  "left-[55%] top-8 h-2.5 w-1 rounded-full bg-[#4e9b72]",
  "left-[65%] top-3 h-1.5 w-2 rounded-sm bg-[#d58762]",
  "right-[26%] top-10 h-2 w-2 rounded-full bg-[#7aa9bd]",
  "right-[20%] top-2 h-2.5 w-1 rounded-full bg-[#c89135]",
  "right-[14%] top-8 h-1.5 w-2 rounded-sm bg-[#4e9b72]",
  "right-[8%] top-4 h-2 w-2 rounded-sm bg-[#d58762]",
  "right-[3%] top-11 h-1.5 w-1.5 rounded-full bg-[#7aa9bd]",
] as const;

export function TenantOnboardingTracker({ schoolId, onNavigate }: Props) {
  const onboarding = trpc.nsos.onboarding.status.useQuery({ schoolId });
  const data = onboarding.data;
  const [celebrationDismissed, setCelebrationDismissed] = useState(true);

  useEffect(() => {
    if (data?.completionPercent !== 100) {
      setCelebrationDismissed(true);
      return;
    }
    try {
      setCelebrationDismissed(window.localStorage.getItem(tenantOnboardingCelebrationStorageKey(schoolId)) === "true");
    } catch {
      setCelebrationDismissed(false);
    }
  }, [data?.completionPercent, schoolId]);

  const dismissCelebration = () => {
    try {
      window.localStorage.setItem(tenantOnboardingCelebrationStorageKey(schoolId), "true");
    } catch {
      // A private browser session may block storage; the current-view dismissal still applies.
    }
    setCelebrationDismissed(true);
  };

  if (onboarding.isLoading) {
    return <section aria-label="Tenant onboarding progress" className="rounded-[1.2rem] border border-[#dbe8df] bg-[#f8fcf8] p-5 shadow-[0_10px_32px_rgba(16,45,35,0.035)] sm:p-6"><div className="h-4 w-44 animate-pulse rounded bg-[#e3ece5]" /><div className="mt-5 h-2.5 animate-pulse rounded-full bg-[#e3ece5]" /><div className="mt-5 grid gap-3 md:grid-cols-3"><div className="h-20 animate-pulse rounded-xl bg-white/75" /><div className="h-20 animate-pulse rounded-xl bg-white/75" /><div className="h-20 animate-pulse rounded-xl bg-white/75" /></div></section>;
  }

  if (onboarding.error) {
    return <section aria-labelledby="onboarding-title" className="rounded-[1.2rem] border border-[#ead6b4] bg-[#fffaf1] p-5 shadow-[0_10px_32px_rgba(16,45,35,0.035)] sm:p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p id="onboarding-title" className="text-sm font-semibold text-[#5d4318]">Your setup progress is temporarily unavailable</p><p className="mt-1 text-xs leading-5 text-[#78623a]">The rest of your command center remains available. Try loading the tracker again.</p></div><button type="button" onClick={() => onboarding.refetch()} className="w-fit rounded-lg border border-[#d8bf91] bg-white px-3 py-2 text-xs font-bold text-[#76521a] transition hover:bg-[#fff7e8]">Try again</button></div></section>;
  }

  if (!data) return null;
  const next = data.nextStep;
  const showCelebration = shouldShowTenantOnboardingCelebration(data.completionPercent, celebrationDismissed);

  return <section data-onboarding-tracker aria-labelledby="onboarding-title" className="overflow-hidden rounded-[1.2rem] border border-[#d5e5d9] bg-[linear-gradient(125deg,#f7fbf7_0%,#eef8f0_52%,#f8f4e9_100%)] shadow-[0_10px_32px_rgba(16,45,35,0.035)]">
    <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-start">
      <div className="flex gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0f5c4f] text-white shadow-[0_8px_18px_rgba(15,92,79,0.18)]"><Sparkles className="h-4 w-4" /></span>
        <div>
          <p className="mono text-[10px] font-semibold uppercase tracking-[0.15em] text-[#176145]">Tenant setup</p>
          <h2 id="onboarding-title" className="mt-1 text-lg font-semibold tracking-[-0.025em] text-[#1d3429]">Build your school workspace, one confident step at a time.</h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-[#60746a]">Progress reflects real school records. Nothing is marked complete until the required setup is actually in place.</p>
        </div>
      </div>
      <div className="rounded-xl border border-[#d4e3d7] bg-white/85 px-3 py-2 text-left lg:text-right"><p className="mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#557367]">Completion</p><p role="status" aria-live="polite" className="mt-0.5 text-sm font-bold text-[#176145]">{data.completedSteps} of {data.totalSteps} complete</p></div>
    </div>

    <div className="border-y border-[#dce8df] bg-white/55 px-5 py-4 sm:px-6"><div className="flex items-center justify-between gap-4"><p className="text-xs font-semibold text-[#365348]">{data.completionPercent}% of tenant setup complete</p><p className="mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6c8176]">{data.completedSteps}/{data.totalSteps}</p></div><Progress value={data.completionPercent} aria-label="Tenant onboarding completion" className="mt-2.5 h-2.5 bg-[#dce9df] [&_[data-slot=progress-indicator]]:bg-[#0f5c4f]" /></div>

    {showCelebration ? <section data-onboarding-completion-celebration role="status" aria-live="polite" aria-labelledby="onboarding-celebration-title" className="onboarding-completion-celebration relative mx-5 mt-5 overflow-hidden rounded-xl border border-[#d0e5d5] bg-[#eaf7ed] p-4 text-[#176145] sm:mx-6 sm:p-5">{celebrationConfetti.map((className, index) => <span key={className} aria-hidden="true" data-confetti-piece={index + 1} className={`onboarding-completion-confetti absolute ${className}`} />)}<div className="relative flex gap-3 pr-8"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[#b1771d] shadow-sm"><PartyPopper className="h-5 w-5" /></span><div><p className="mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5a825f]">Milestone reached</p><h3 id="onboarding-celebration-title" className="mt-1 text-sm font-bold text-[#24533a]">Your school workspace is ready for the term ahead.</h3><p className="mt-1 max-w-2xl text-xs leading-5 text-[#4e6f5c]">Every essential setup step is complete. You can now manage daily operations with confidence.</p></div></div><button type="button" onClick={dismissCelebration} className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg text-[#527261] transition hover:bg-white/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f5c4f]" aria-label="Dismiss setup completion celebration"><X className="h-4 w-4" /></button></section> : null}

    {next ? <div className="mx-5 mt-5 flex flex-col gap-3 rounded-xl border border-[#d8e5da] bg-white/90 p-4 sm:mx-6 sm:flex-row sm:items-center sm:justify-between"><div><p className="mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#176145]">Next recommended action</p><p className="mt-1 text-sm font-semibold text-[#294437]">{next.label}</p><p className="mt-1 max-w-xl text-xs leading-5 text-[#65776d]">{next.description}</p></div>{next.destination && next.actionLabel ? <button type="button" onClick={() => onNavigate(next.destination!)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#0f5c4f] px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-[#0c4e43] active:scale-[0.97]">{next.actionLabel}<ArrowUpRight className="h-3.5 w-3.5" /></button> : null}</div> : <div className="mx-5 mt-5 flex gap-3 rounded-xl border border-[#cfe2d3] bg-[#eaf6ed] p-4 text-[#176145] sm:mx-6"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white"><Check className="h-4 w-4" /></span><div><p className="text-sm font-bold">Your essential tenant setup is complete.</p><p className="mt-1 text-xs leading-5 text-[#4e6f5c]">Continue using NSOS to manage daily school operations, or revisit any area whenever your school changes.</p></div></div>}

    <ol aria-label="Tenant onboarding steps" className="mt-5 grid divide-y divide-[#e1e9e2] border-t border-[#e1e9e2] bg-white/70 md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-3">
      {data.steps.map((step, index) => <li key={step.id} className="min-w-0 p-4 sm:p-5"><div className="flex items-start gap-3"><span aria-hidden="true" className={step.completed ? "grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#dff0e3] text-[#176145]" : "grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[#c8d9cc] bg-white text-[#708078]"}>{step.completed ? <Check className="h-4 w-4" /> : <CircleDashed className="h-4 w-4" />}</span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-[#30493d]">{index + 1}. {step.label}</p><span className={step.completed ? "text-[10px] font-bold uppercase tracking-[0.1em] text-[#257152]" : "text-[10px] font-bold uppercase tracking-[0.1em] text-[#829087]"}>{step.completed ? "Complete" : "To do"}</span></div><p className="mt-1 text-xs leading-5 text-[#738079]">{step.description}</p>{!step.completed && step.destination && step.actionLabel ? <button type="button" onClick={() => onNavigate(step.destination!)} className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[#0f5c4f] underline decoration-[#a8cbb0] underline-offset-4 transition hover:text-[#0a473d]">{step.actionLabel}<ArrowUpRight className="h-3.5 w-3.5" /></button> : null}</div></div></li>)}
    </ol>
  </section>;
}

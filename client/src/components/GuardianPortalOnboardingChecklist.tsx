import { BadgeCheck, CheckCircle2, Circle, FileText, MessageSquareText, ShieldCheck, UsersRound } from "lucide-react";

export type GuardianPortalOnboardingData = {
  guardian?: { email?: string | null; phone?: string | null } | null;
  students?: Array<unknown>;
  invoices?: Array<unknown>;
  announcements?: Array<{ status?: string | null }>;
};

export type GuardianPortalOnboardingStep = {
  id: "profile" | "learners" | "fees" | "updates";
  title: string;
  detail: string;
  status: string;
  complete: boolean;
  icon: typeof BadgeCheck;
};

/**
 * This derives guidance from the authenticated guardian's existing portal payload only.
 * It never writes to school, student, guardian, invoice, or announcement records.
 */
export function guardianPortalOnboardingSteps(data?: GuardianPortalOnboardingData): GuardianPortalOnboardingStep[] {
  const learnerCount = data?.students?.length ?? 0;
  const invoiceCount = data?.invoices?.length ?? 0;
  const publishedNoticeCount = (data?.announcements ?? []).filter(item => item.status === "published").length;
  const profileAvailable = Boolean(data?.guardian);

  return [
    {
      id: "profile",
      title: "Review your guardian profile",
      detail: profileAvailable
        ? "Confirm that the contact details the school holds for you are familiar. Ask the school office to correct anything that is out of date."
        : "Your verified sign-in is active, but a guardian profile has not yet been linked. Contact the school office for help.",
      status: profileAvailable ? "Profile available" : "School link needed",
      complete: profileAvailable,
      icon: BadgeCheck,
    },
    {
      id: "learners",
      title: "View your linked learners",
      detail: learnerCount
        ? "Your linked learner records are listed in this portal. Their attendance, published results, and fee information stay scoped to your family."
        : "No learner record is linked yet. The school office can review the family connection; this portal cannot create one automatically.",
      status: learnerCount ? `${learnerCount} linked` : "Waiting for link",
      complete: learnerCount > 0,
      icon: UsersRound,
    },
    {
      id: "fees",
      title: "Check fees and payment evidence",
      detail: invoiceCount
        ? "Review the fee history and any payment-evidence status shown below before contacting the finance team."
        : "Invoices will appear here only when the school shares them with your linked learner record.",
      status: invoiceCount ? `${invoiceCount} visible` : "No invoices shared",
      complete: invoiceCount > 0,
      icon: FileText,
    },
    {
      id: "updates",
      title: "Read school updates",
      detail: publishedNoticeCount
        ? "The noticeboard contains only published updates intended for guardians or the whole school community."
        : "Published updates will appear in the school noticeboard when the school shares them.",
      status: publishedNoticeCount ? `${publishedNoticeCount} published` : "No notices yet",
      complete: publishedNoticeCount > 0,
      icon: MessageSquareText,
    },
  ];
}

export function GuardianPortalOnboardingChecklist({ data }: { data?: GuardianPortalOnboardingData }) {
  const steps = guardianPortalOnboardingSteps(data);
  const completedCount = steps.filter(step => step.complete).length;
  const completionPercent = Math.round((completedCount / steps.length) * 100);

  return (
    <section aria-label="Guardian portal onboarding" className="overflow-hidden rounded-[1.2rem] border border-[#cfe2d3] bg-[#f7fcf7] shadow-[0_10px_32px_rgba(16,45,35,0.03)]">
      <div className="grid gap-4 border-b border-[#dceadf] bg-[linear-gradient(118deg,#e8f5e9_0%,#f9fcf8_72%)] px-5 py-5 sm:grid-cols-[1fr_auto] sm:items-center sm:px-6">
        <div className="flex gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0f5c4f] text-white shadow-sm"><ShieldCheck className="h-5 w-5" /></span>
          <div>
            <p className="text-sm font-semibold text-[#1d4031]">First steps in your guardian portal</p>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-[#5c7668]">This read-only guide uses the information already shared with your verified portal. It never creates or changes a learner, guardian, fee, or school update.</p>
          </div>
        </div>
        <div className="rounded-xl border border-[#d1e3d4] bg-white/85 px-3 py-2 text-right shadow-sm">
          <p className="mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#4f7864]">Portal readiness</p>
          <p className="mt-0.5 text-sm font-bold text-[#1b4d39]">{completedCount} of {steps.length} available · {completionPercent}%</p>
        </div>
      </div>
      <div className="grid divide-y divide-[#e4eee5]">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return <div key={step.id} className="flex gap-3 px-5 py-4 sm:px-6">
            <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${step.complete ? "bg-[#def0e2] text-[#176145]" : "bg-[#f1f4f0] text-[#718178]"}`}><Icon className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7b8c82]">Step {index + 1}</span>
                <p className="text-sm font-semibold text-[#294539]">{step.title}</p>
              </div>
              <p className="mt-1 text-xs leading-5 text-[#66796e]">{step.detail}</p>
            </div>
            <span className={`inline-flex h-fit shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${step.complete ? "bg-[#e2f2e5] text-[#176145]" : "bg-[#f1f3f0] text-[#64746b]"}`}>{step.complete ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}{step.status}</span>
          </div>;
        })}
      </div>
    </section>
  );
}

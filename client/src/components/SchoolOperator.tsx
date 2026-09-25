import {
  Activity,
  ArrowRight,
  BrainCircuit,
  CircleAlert,
  ClipboardCheck,
  Loader2,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  WalletCards,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { SchoolSuccessLoop } from "@/components/SchoolSuccessLoop";

type Destination =
  | "overview"
  | "learning"
  | "admissions"
  | "finance"
  | "communications"
  | "automation"
  | "website"
  | "institution-builder";
type WorkflowPreferences = {
  reviewFocus:
    | "balanced"
    | "learning"
    | "admissions"
    | "revenue"
    | "operational_readiness";
  reviewCadence: "daily" | "weekly" | "monthly";
  evidenceDetail: "concise" | "standard";
  showDismissedInsights: boolean;
};

const tone: Record<string, string> = {
  info: "border-[#c7e4d1] bg-[#f2fbf5] text-[#216044]",
  attention: "border-[#ead9a6] bg-[#fffaf0] text-[#785f2c]",
  review: "border-[#efc6be] bg-[#fff5f2] text-[#8d4137]",
};
const defaultWorkflowPreferences: WorkflowPreferences = {
  reviewFocus: "balanced",
  reviewCadence: "weekly",
  evidenceDetail: "standard",
  showDismissedInsights: false,
};
const focusTypes: Record<WorkflowPreferences["reviewFocus"], string[]> = {
  balanced: [],
  learning: ["learning", "lifecycle", "certificate"],
  admissions: ["admissions"],
  revenue: ["revenue"],
  operational_readiness: ["readiness", "health"],
};

export function SchoolOperator({
  schoolId,
  onNavigate,
}: {
  schoolId: number;
  onNavigate: (destination: Destination) => void;
}) {
  const utils = trpc.useUtils();
  const workspace = trpc.nsos.schoolOperator.workspace.useQuery({ schoolId });
  const [refreshConfirmed, setRefreshConfirmed] = useState(false);
  const [profileConfirmed, setProfileConfirmed] = useState(false);
  const [workflowPreferencesConfirmed, setWorkflowPreferencesConfirmed] =
    useState(false);
  const [profile, setProfile] = useState({
    mission: "",
    targetLearners: "",
    brandTone: "",
    teachingPhilosophy: "",
    curriculumStrategy: "",
    pricingApproach: "",
    policyNotes: "",
    operatingGoals: "",
  });
  const [workflowPreferences, setWorkflowPreferences] =
    useState<WorkflowPreferences>(defaultWorkflowPreferences);
  const [question, setQuestion] = useState("");
  const refresh = trpc.nsos.schoolOperator.refresh.useMutation({
    onSuccess: async insights => {
      setRefreshConfirmed(false);
      toast.success(
        `${insights.length} private School Operator insight${insights.length === 1 ? "" : "s"} refreshed.`
      );
      await utils.nsos.schoolOperator.workspace.invalidate({ schoolId });
    },
    onError: error => toast.error(error.message),
  });
  const saveProfile = trpc.nsos.schoolOperator.saveProfile.useMutation({
    onSuccess: async () => {
      setProfileConfirmed(false);
      toast.success(
        "Institution operating memory saved for future private planning."
      );
      await utils.nsos.schoolOperator.workspace.invalidate({ schoolId });
    },
    onError: error => toast.error(error.message),
  });
  const saveWorkflowPreferences =
    trpc.nsos.schoolOperator.saveWorkflowPreferences.useMutation({
      onSuccess: async () => {
        setWorkflowPreferencesConfirmed(false);
        toast.success(
          "Approval-first review preferences saved for this institution."
        );
        await utils.nsos.schoolOperator.workspace.invalidate({ schoolId });
      },
      onError: error => toast.error(error.message),
    });
  const ask = trpc.nsos.schoolOperator.ask.useMutation();
  const dismiss = trpc.nsos.schoolOperator.dismissInsight.useMutation({
    onSuccess: async () => {
      toast.success("Insight dismissed for this institution.");
      await utils.nsos.schoolOperator.workspace.invalidate({ schoolId });
    },
    onError: error => toast.error(error.message),
  });
  const data = workspace.data;
  const pending =
    refresh.isPending ||
    saveProfile.isPending ||
    saveWorkflowPreferences.isPending ||
    dismiss.isPending;

  useEffect(() => {
    const source = data?.profile;
    if (!source) return;
    setProfile({
      mission: source.mission ?? "",
      targetLearners: source.targetLearners ?? "",
      brandTone: source.brandTone ?? "",
      teachingPhilosophy: source.teachingPhilosophy ?? "",
      curriculumStrategy: source.curriculumStrategy ?? "",
      pricingApproach: source.pricingApproach ?? "",
      policyNotes: source.policyNotes ?? "",
      operatingGoals: source.operatingGoals ?? "",
    });
  }, [data?.profile?.updatedAt]);

  useEffect(() => {
    const source = data?.workflowPreferences;
    if (!source) return;
    setWorkflowPreferences({
      reviewFocus: source.reviewFocus,
      reviewCadence: source.reviewCadence,
      evidenceDetail: source.evidenceDetail,
      showDismissedInsights: source.showDismissedInsights,
    });
  }, [data?.workflowPreferences?.updatedAt]);

  if (workspace.isLoading)
    return (
      <div className="grid min-h-80 place-items-center rounded-[1.5rem] border border-[#dce8e0] bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-[#087158] motion-reduce:animate-none" />
      </div>
    );
  if (!data)
    return (
      <div className="rounded-[1.5rem] border border-[#efd2cb] bg-[#fff7f5] p-6 text-sm text-[#84463d]">
        School Operator data is unavailable. Refresh the page and try again.
      </div>
    );
  const metrics = [
    {
      label: "Active students",
      value: data.dashboard.activeStudents,
      icon: Activity,
    },
    {
      label: "Pending admissions",
      value: data.dashboard.pendingAdmissions,
      icon: ClipboardCheck,
    },
    {
      label: "Attendance rate",
      value: `${data.dashboard.attendanceRate}%`,
      icon: BrainCircuit,
    },
    {
      label: "Outstanding",
      value: new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 0,
      }).format(data.dashboard.outstanding),
      icon: WalletCards,
    },
  ];
  const emailReadiness = data.commandCenter.communications.email;
  const health =
    emailReadiness.failedCount > 0
      ? {
          label: "Needs review",
          detail: `${emailReadiness.failedCount} recorded email delivery failure${emailReadiness.failedCount === 1 ? "" : "s"}. NSOS will not retry or change delivery settings automatically.`,
          className: "border-[#efc6be] bg-[#fff5f2] text-[#8d4137]",
        }
      : emailReadiness.managedSenderNeedsVerification
        ? {
            label: "Attention required",
            detail:
              "Email sender verification is still required before the institution should rely on managed delivery.",
            className: "border-[#ead9a6] bg-[#fffaf0] text-[#785f2c]",
          }
        : {
            label: "No recorded delivery failure",
            detail:
              "This reflects current NSOS delivery records only; it is not a guarantee that every external service is healthy.",
            className: "border-[#c7e4d1] bg-[#f2fbf5] text-[#216044]",
          };
  const visibleInsights = data.insights.filter(
    (item: any) =>
      workflowPreferences.showDismissedInsights || item.status === "open"
  );
  const focusTypeSet = new Set(focusTypes[workflowPreferences.reviewFocus]);
  const morningActions = [
    data.dashboard.outstanding > 0
      ? {
          label: "Cash follow-up",
          value: new Intl.NumberFormat("en-NG", {
            style: "currency",
            currency: "NGN",
            maximumFractionDigits: 0,
          }).format(data.dashboard.outstanding),
          detail: "Outstanding balance currently recorded.",
          destination: "finance" as Destination,
        }
      : null,
    data.dashboard.pendingAdmissions > 0
      ? {
          label: "Admissions",
          value: String(data.dashboard.pendingAdmissions),
          detail: "Application(s) currently waiting for school review.",
          destination: "admissions" as Destination,
        }
      : null,
    data.dashboard.attendanceRate < 90
      ? {
          label: "Attendance",
          value: `${data.dashboard.attendanceRate}%`,
          detail: "Current attendance needs a closer look.",
          destination: "overview" as Destination,
        }
      : null,
    data.attentionQueue[0]
      ? {
          label: "Priority review",
          value: "1",
          detail: data.attentionQueue[0].title,
          destination:
            (data.attentionQueue[0].actionDestination as Destination) ||
            "overview",
        }
      : null,
  ].filter(Boolean) as Array<{
    label: string;
    value: string;
    detail: string;
    destination: Destination;
  }>;
  return (
    <div className="grid gap-6">
      <SchoolSuccessLoop data={data} onNavigate={onNavigate} />
      <section className="rounded-[1.6rem] border border-[#d9e8df] bg-white p-5 shadow-[0_14px_36px_rgba(20,58,42,.05)] sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#167457]">
              Owner Morning Brief
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-[-.04em] text-[#203d31]">
              Start with what matters today.
            </h2>
            <p className="mt-2 max-w-2xl text-xs leading-5 text-[#718279]">
              A short action list built from the school's current records. NSOS
              does not guess, predict, or execute anything from this brief.
            </p>
          </div>
          <span className="rounded-full border border-[#d9e8df] bg-[#f5faf7] px-3 py-1.5 text-[10px] font-extrabold text-[#286148]">
            {morningActions.length} action
            {morningActions.length === 1 ? "" : "s"} surfaced
          </span>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {morningActions.length ? (
            morningActions.map(action => (
              <button
                key={action.label}
                type="button"
                onClick={() => onNavigate(action.destination)}
                className="group rounded-2xl border border-[#dce9e1] bg-[#fbfdfb] p-4 text-left transition hover:-translate-y-0.5 hover:border-[#9bd4bb] hover:shadow-[0_10px_24px_rgba(20,58,42,.06)]"
              >
                <p className="text-[9px] font-extrabold uppercase tracking-[.1em] text-[#718279]">
                  {action.label}
                </p>
                <p className="mt-2 truncate text-xl font-black tracking-[-.035em] text-[#244b39]">
                  {action.value}
                </p>
                <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-[#66776e]">
                  {action.detail}
                </p>
                <span className="mt-3 inline-flex items-center text-[9px] font-extrabold text-[#176b4d]">
                  Review{" "}
                  <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              </button>
            ))
          ) : (
            <div className="rounded-2xl border border-[#c7e4d1] bg-[#f2fbf5] p-5 sm:col-span-2 xl:col-span-4">
              <p className="text-sm font-extrabold text-[#216044]">
                No immediate exception surfaced.
              </p>
              <p className="mt-1 text-[10px] leading-5 text-[#5f7569]">
                Keep using NSOS as the school's source of record; this brief
                will change when the underlying records change.
              </p>
            </div>
          )}
        </div>
      </section>
      <section className="overflow-hidden rounded-[1.6rem] border border-[#9bd4bb] bg-[radial-gradient(circle_at_94%_6%,rgba(191,255,217,.25),transparent_30%),linear-gradient(135deg,#062d28_0%,#075e4c_60%,#0a8062_100%)] p-5 text-white shadow-[0_20px_50px_rgba(5,67,52,.15)] sm:p-7">
        <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr] lg:items-end">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#d8fae8] text-[#075541]">
                <BrainCircuit className="h-5 w-5" />
              </span>
              <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#c9f0dc]">
                AI School Operator
              </p>
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-[-.045em] sm:text-4xl">
              What needs your attention?
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#cce9da]">
              NSOS turns current, tenant-scoped operational data into
              explainable private recommendations. It never predicts individual
              outcomes, sends messages, changes records, or runs a consequential
              action without the right protected workflow and your approval.
            </p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-black/10 p-4 text-xs leading-5 text-[#e6faef]">
            <div className="flex items-center gap-2 font-extrabold">
              <ShieldCheck className="h-4 w-4" />
              Approval-first intelligence
            </div>
            <p className="mt-2 text-white/75">
              Refresh reads current aggregate data only. Every recommendation is
              a handoff; no grades, certificates, prices, people, payments,
              provider changes, messages, domains, or public content are changed
              here.
            </p>
          </div>
        </div>
        <label className="mt-5 flex gap-2 rounded-xl border border-white/15 bg-black/10 p-3 text-[11px] font-semibold leading-4 text-white/90">
          <input
            type="checkbox"
            checked={refreshConfirmed}
            onChange={event => setRefreshConfirmed(event.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[#d8fae8]"
          />
          I understand this refresh creates or updates private, explainable
          insight records only. It does not take action.
        </label>
        <button
          type="button"
          disabled={!refreshConfirmed || pending}
          onClick={() => refresh.mutate({ schoolId, confirmed: true })}
          className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-xs font-extrabold text-[#075541] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${refresh.isPending ? "animate-spin motion-reduce:animate-none" : ""}`}
          />
          Refresh private insights
        </button>
      </section>
      <section className="rounded-[1.4rem] border border-[#b9dccc] bg-white p-5 shadow-[0_10px_28px_rgba(25,58,42,.05)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-base font-extrabold text-[#284c3d]">
              Ask My School
            </p>
            <p className="mt-1 max-w-2xl text-[11px] leading-5 text-[#6b8075]">
              Ask about the current operating state. NSOS answers only from
              tenant-scoped evidence it can verify; it does not invent missing
              data.
            </p>
          </div>
          <span className="rounded-full bg-[#edf8f1] px-3 py-1 text-[10px] font-extrabold text-[#1f704f]">
            Evidence-first
          </span>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={question}
            onChange={event => setQuestion(event.target.value)}
            maxLength={500}
            placeholder="e.g. What needs my attention right now?"
            className="min-h-11 flex-1 rounded-xl border border-[#d9e7df] bg-[#fbfdfb] px-3 text-xs text-[#244236] outline-none focus:border-[#087158] focus:ring-2 focus:ring-[#087158]/10"
          />
          <button
            type="button"
            disabled={question.trim().length < 2 || ask.isPending}
            onClick={() => ask.mutate({ schoolId, question: question.trim() })}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#087158] px-5 text-xs font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <BrainCircuit className="h-4 w-4" />
            {ask.isPending ? "Checking…" : "Ask"}
          </button>
        </div>
        {ask.data && question.trim().length >= 2 && (
          <article className="mt-4 rounded-xl border border-[#dce9e1] bg-[#f7fcf8] p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white px-2 py-1 text-[9px] font-extrabold uppercase tracking-[.08em] text-[#286148]">
                {ask.data.confidence} confidence
              </span>
              <span className="text-[9px] font-semibold text-[#718279]">
                {ask.data.evidence.length} evidence item
                {ask.data.evidence.length === 1 ? "" : "s"}
              </span>
            </div>
            <p className="mt-3 text-sm font-bold leading-6 text-[#284c3d]">
              {ask.data.answer}
            </p>
            {ask.data.evidence.length > 0 && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {ask.data.evidence.slice(0, 4).map((item: any) => (
                  <div
                    key={item.metric}
                    className="rounded-lg border border-[#dce9e1] bg-white p-3"
                  >
                    <p className="text-[9px] font-extrabold uppercase tracking-[.08em] text-[#718279]">
                      {item.metric.replaceAll("_", " ")}
                    </p>
                    <p className="mt-1 text-xs font-black text-[#284c3d]">
                      {String(item.value)}
                    </p>
                    <p className="mt-1 text-[9px] text-[#718279]">
                      {item.source}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {ask.data.suggestedDestination && (
              <button
                type="button"
                onClick={() =>
                  onNavigate(ask.data.suggestedDestination as Destination)
                }
                className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-extrabold text-[#176b4d] underline-offset-2 hover:underline"
              >
                Review protected workspace{" "}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
            {ask.data.limitations.length > 0 && (
              <p className="mt-3 text-[10px] leading-5 text-[#6b8075]">
                Limit: {ask.data.limitations[0]}
              </p>
            )}
          </article>
        )}
      </section>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(metric => (
          <div
            key={metric.label}
            className="rounded-2xl border border-[#dce9e1] bg-white p-4 shadow-[0_8px_20px_rgba(20,58,42,.04)]"
          >
            <metric.icon className="h-4 w-4 text-[#167457]" />
            <p className="mt-3 text-2xl font-black tracking-[-.04em] text-[#244b39]">
              {metric.value}
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[.08em] text-[#718279]">
              {metric.label}
            </p>
          </div>
        ))}
      </section>
      <section className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
        <section className="rounded-[1.4rem] border border-[#dce9e1] bg-white p-5 shadow-[0_10px_28px_rgba(25,58,42,.04)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-base font-extrabold text-[#284c3d]">
                School Health
              </p>
              <p className="mt-1 text-[11px] leading-5 text-[#6b8075]">
                A compact operating picture built from current tenant-scoped
                records. These are review cues, not ratings or forecasts.
              </p>
            </div>
            <span className="rounded-full bg-[#edf8f1] px-3 py-1 text-[10px] font-extrabold text-[#1f704f]">
              {
                data.healthSignals.filter(
                  (signal: any) => signal.status === "healthy"
                ).length
              }
              /{data.healthSignals.length} stable
            </span>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {data.healthSignals.map((signal: any) => (
              <HealthSignal
                key={signal.id}
                signal={signal}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </section>
        <section className="rounded-[1.4rem] border border-[#dce9e1] bg-[#102a24] p-5 text-white shadow-[0_10px_28px_rgba(25,58,42,.08)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-extrabold">Attention queue</p>
              <p className="mt-1 text-[11px] leading-5 text-white/65">
                The next protected reviews are surfaced from open insights.
                Nothing is executed from this queue.
              </p>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-extrabold">
              {data.reviewSummary.attention + data.reviewSummary.review} review
            </span>
          </div>
          <div className="mt-4 space-y-2">
            {data.attentionQueue.slice(0, 5).map((item: any) => (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  item.actionDestination &&
                  onNavigate(item.actionDestination as Destination)
                }
                className="flex w-full items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-left hover:bg-white/10"
              >
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/10 text-[10px] font-black">
                  {item.priority}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-extrabold">
                    {item.title}
                  </span>
                  <span className="mt-1 block text-[10px] leading-4 text-white/60">
                    {item.detail}
                  </span>
                </span>
                <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-white/45" />
              </button>
            ))}
            {!data.attentionQueue.length && (
              <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-[10px] leading-5 text-white/65">
                No open insight is currently queued for review.
              </p>
            )}
          </div>
        </section>
      </section>
      <section className={`rounded-2xl border p-4 ${health.className}`}>
        <div className="flex items-start gap-3">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="text-xs font-extrabold">
              System health: {health.label}
            </p>
            <p className="mt-1 text-[11px] leading-5 opacity-90">
              {health.detail}
            </p>
            <button
              type="button"
              onClick={() => onNavigate("communications")}
              className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-extrabold underline-offset-2 hover:underline"
            >
              Review delivery configuration{" "}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </section>
      <AcademyLaunchReadiness
        readiness={data.launchReadiness}
        onNavigate={onNavigate}
      />
      <section className="rounded-2xl border border-[#d4e4da] bg-[#f7fcf8] p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#176b4d]" />
          <div>
            <p className="text-xs font-extrabold text-[#315946]">
              Owner authority stays on
            </p>
            <p className="mt-1 text-[11px] leading-5 text-[#587165]">
              AI can prepare private planning and show current aggregate
              evidence. Your protected review remains required for every
              consequential action.
            </p>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <PolicyItem
                title="Planning and insight refresh"
                detail="Private preparation and current aggregate insight records only; no operational action follows automatically."
              />
              <PolicyItem
                title="Academic judgement"
                detail="A human remains responsible for assessment, grades, results, completion, and credentials."
              />
              <PolicyItem
                title="Public, financial, and people actions"
                detail="Publication, messages, campaigns, spend, fees, payments, admissions, enrolment, providers, and domains stay in separately confirmed workspaces."
              />
              <PolicyItem
                title="No unattended autopilot"
                detail="A review cue is not a schedule. NSOS does not run background loops, automatic retries, or triggered consequential work from School Operator."
              />
            </div>
          </div>
        </div>
      </section>
      <section className="rounded-[1.4rem] border border-[#dce9e1] bg-white p-5 shadow-[0_10px_28px_rgba(25,58,42,.04)]">
        <div>
          <p className="text-base font-extrabold text-[#284c3d]">
            Approval-first workflow preferences
          </p>
          <p className="mt-1 max-w-2xl text-[11px] leading-5 text-[#6b8075]">
            Set how this private review workspace presents current insights.
            These settings do not schedule a refresh, remove confirmation gates,
            bypass roles or rate limits, execute a handoff, or change the
            underlying tenant data.
          </p>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <SelectField
            label="Review focus"
            value={workflowPreferences.reviewFocus}
            onChange={reviewFocus =>
              setWorkflowPreferences(value => ({
                ...value,
                reviewFocus: reviewFocus as WorkflowPreferences["reviewFocus"],
              }))
            }
            options={[
              { value: "balanced", label: "Balanced operational review" },
              { value: "learning", label: "Learning delivery and support" },
              { value: "admissions", label: "Admissions readiness" },
              { value: "revenue", label: "Finance readiness" },
              {
                value: "operational_readiness",
                label: "Operational readiness and health",
              },
            ]}
          />
          <SelectField
            label="Private review cue"
            value={workflowPreferences.reviewCadence}
            onChange={reviewCadence =>
              setWorkflowPreferences(value => ({
                ...value,
                reviewCadence:
                  reviewCadence as WorkflowPreferences["reviewCadence"],
              }))
            }
            options={[
              { value: "daily", label: "Daily internal review cue" },
              { value: "weekly", label: "Weekly internal review cue" },
              { value: "monthly", label: "Monthly internal review cue" },
            ]}
          />
          <SelectField
            label="Evidence display"
            value={workflowPreferences.evidenceDetail}
            onChange={evidenceDetail =>
              setWorkflowPreferences(value => ({
                ...value,
                evidenceDetail:
                  evidenceDetail as WorkflowPreferences["evidenceDetail"],
              }))
            }
            options={[
              { value: "standard", label: "Standard metric and source" },
              { value: "concise", label: "Concise source label" },
            ]}
          />
          <label className="flex min-h-11 items-center gap-2 rounded-xl border border-[#d9e7df] bg-[#fbfdfb] px-3 text-[11px] font-semibold text-[#52695d]">
            <input
              type="checkbox"
              checked={workflowPreferences.showDismissedInsights}
              onChange={event =>
                setWorkflowPreferences(value => ({
                  ...value,
                  showDismissedInsights: event.target.checked,
                }))
              }
              className="h-4 w-4 accent-[#087158]"
            />
            Also show locally dismissed insights
          </label>
        </div>
        <p className="mt-3 rounded-xl border border-[#d8e8df] bg-[#f5fbf7] p-3 text-[10px] leading-5 text-[#547166]">
          A review cue is a planning preference only. NSOS does not schedule,
          monitor, refresh, message, retry, or execute work in the background
          from this setting.
        </p>
        <label className="mt-3 flex gap-2 rounded-xl border border-[#ead9a6] bg-[#fffaf0] p-3 text-[10px] font-semibold leading-4 text-[#745b2b]">
          <input
            type="checkbox"
            checked={workflowPreferencesConfirmed}
            onChange={event =>
              setWorkflowPreferencesConfirmed(event.target.checked)
            }
            className="mt-0.5 h-4 w-4 accent-[#087158]"
          />
          I confirm these are private review-display preferences only. They
          cannot approve, publish, send, charge, enrol, grade, complete,
          certify, or change provider or domain settings.
        </label>
        <button
          type="button"
          disabled={!workflowPreferencesConfirmed || pending}
          onClick={() =>
            saveWorkflowPreferences.mutate({
              schoolId,
              preferences: workflowPreferences,
              confirmed: true,
            })
          }
          className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#175e49] px-4 text-xs font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Save workflow preferences
        </button>
      </section>
      <section className="rounded-[1.4rem] border border-[#dce9e1] bg-white p-5 shadow-[0_10px_28px_rgba(25,58,42,.05)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-base font-extrabold text-[#284c3d]">
              Private recommendations
            </p>
            <p className="mt-1 max-w-2xl text-[11px] leading-5 text-[#6b8075]">
              Each recommendation states its current evidence source and opens a
              protected workspace. A missing insight is not proof that a problem
              does not exist; NSOS does not invent trends or individual risk
              labels.
            </p>
          </div>
          <span className="rounded-full bg-[#edf8f1] px-3 py-1 text-[10px] font-extrabold text-[#1f704f]">
            {data.insights.filter((item: any) => item.status === "open").length}{" "}
            open
          </span>
        </div>
        <div className="mt-4 grid gap-3">
          {visibleInsights.map((insight: any) => (
            <article
              key={insight.id}
              className={`rounded-xl border p-4 ${tone[insight.severity] ?? tone.info} ${focusTypeSet.has(insight.insightType) ? "ring-1 ring-current/20" : ""}`}
            >
              <div className="flex gap-3">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-extrabold">
                          {insight.title}
                        </p>
                        {focusTypeSet.has(insight.insightType) && (
                          <span className="rounded-full bg-white/60 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[.08em]">
                            Review focus
                          </span>
                        )}
                        {insight.status === "dismissed" && (
                          <span className="rounded-full bg-white/60 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[.08em]">
                            Dismissed locally
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[11px] leading-5 opacity-90">
                        {insight.detail}
                      </p>
                    </div>
                    {insight.status === "open" && (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          dismiss.mutate({
                            schoolId,
                            insightId: insight.id,
                            confirmed: true,
                          })
                        }
                        className="rounded-lg bg-white/70 p-1.5 transition hover:bg-white"
                        aria-label={`Dismiss ${insight.title}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="mt-3 text-[10px] font-semibold opacity-80">
                    Evidence:{" "}
                    {workflowPreferences.evidenceDetail === "standard"
                      ? `${insight.evidence.metric.replaceAll("_", " ")} · ${insight.evidence.value} · ${insight.evidence.source}`
                      : insight.evidence.source}
                  </p>
                  {insight.actionDestination && (
                    <button
                      type="button"
                      onClick={() =>
                        onNavigate(insight.actionDestination as Destination)
                      }
                      className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-extrabold underline-offset-2 hover:underline"
                    >
                      Review in the protected workspace{" "}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
          {!visibleInsights.length && (
            <p className="rounded-xl border border-dashed border-[#d9e7de] bg-[#fbfdfb] p-5 text-xs leading-5 text-[#6d8277]">
              No refreshed insights yet. Use the explicit refresh above to
              assess the current tenant-scoped operational state. It will not
              change any institution record.
            </p>
          )}
        </div>
      </section>
      <section className="rounded-[1.4rem] border border-[#dce9e1] bg-white p-5 shadow-[0_10px_28px_rgba(25,58,42,.04)]">
        <div>
          <p className="text-base font-extrabold text-[#284c3d]">
            Institution operating memory
          </p>
          <p className="mt-1 max-w-2xl text-[11px] leading-5 text-[#6b8075]">
            Save the owner-approved context that future private planning should
            respect. Do not enter passwords, provider keys, banking details,
            learner records, staff identities, or sensitive personal
            information.
          </p>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Field
            label="Mission"
            value={profile.mission}
            onChange={mission => setProfile(value => ({ ...value, mission }))}
          />
          <Field
            label="Intended learners"
            value={profile.targetLearners}
            onChange={targetLearners =>
              setProfile(value => ({ ...value, targetLearners }))
            }
          />
          <Field
            label="Brand tone"
            value={profile.brandTone}
            onChange={brandTone =>
              setProfile(value => ({ ...value, brandTone }))
            }
          />
          <Field
            label="Teaching philosophy"
            value={profile.teachingPhilosophy}
            onChange={teachingPhilosophy =>
              setProfile(value => ({ ...value, teachingPhilosophy }))
            }
            multiline
          />
          <Field
            label="Curriculum strategy"
            value={profile.curriculumStrategy}
            onChange={curriculumStrategy =>
              setProfile(value => ({ ...value, curriculumStrategy }))
            }
            multiline
          />
          <Field
            label="Pricing approach"
            value={profile.pricingApproach}
            onChange={pricingApproach =>
              setProfile(value => ({ ...value, pricingApproach }))
            }
            multiline
          />
          <Field
            label="Policy notes"
            value={profile.policyNotes}
            onChange={policyNotes =>
              setProfile(value => ({ ...value, policyNotes }))
            }
            multiline
          />
          <Field
            label="Operating goals"
            value={profile.operatingGoals}
            onChange={operatingGoals =>
              setProfile(value => ({ ...value, operatingGoals }))
            }
            multiline
          />
        </div>
        <label className="mt-4 flex gap-2 rounded-xl border border-[#ead9a6] bg-[#fffaf0] p-3 text-[10px] font-semibold leading-4 text-[#745b2b]">
          <input
            type="checkbox"
            checked={profileConfirmed}
            onChange={event => setProfileConfirmed(event.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[#087158]"
          />
          I confirm this is institution-approved planning context. Saving it
          does not publish, message, enrol, change finance, grade, issue
          credentials, or make public claims.
        </label>
        <button
          type="button"
          disabled={!profileConfirmed || pending}
          onClick={() =>
            saveProfile.mutate({ schoolId, profile, confirmed: true })
          }
          className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#087158] px-4 text-xs font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ShieldCheck className="h-4 w-4" />
          Save private operating memory
        </button>
      </section>
      <section className="rounded-xl border border-[#dce9e1] bg-[#f7fcf8] p-4 text-[10px] leading-5 text-[#587165]">
        <p className="font-extrabold text-[#315946]">Current limits</p>
        <ul className="mt-2 grid gap-1.5">
          {data.limitations.map((limit: string) => (
            <li key={limit}>• {limit}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function HealthSignal({
  signal,
  onNavigate,
}: {
  signal: any;
  onNavigate: (destination: Destination) => void;
}) {
  const style: Record<string, string> = {
    healthy: "border-[#cfe6d7] bg-[#f5fbf7] text-[#286148]",
    watch: "border-[#ead9a6] bg-[#fffaf0] text-[#785f2c]",
    attention: "border-[#efc6be] bg-[#fff5f2] text-[#8d4137]",
  };
  const value =
    signal.unit === "percent"
      ? `${signal.value}%`
      : signal.unit === "currency"
        ? new Intl.NumberFormat("en-NG", {
            style: "currency",
            currency: "NGN",
            maximumFractionDigits: 0,
          }).format(signal.value)
        : String(signal.value);
  return (
    <article
      className={`rounded-xl border p-3 ${style[signal.status] ?? style.watch}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-extrabold uppercase tracking-[.08em]">
          {signal.label}
        </p>
        <span className="rounded-full bg-white/70 px-2 py-0.5 text-[9px] font-extrabold uppercase">
          {signal.status}
        </span>
      </div>
      <p className="mt-2 text-lg font-black tracking-[-.03em]">{value}</p>
      <p className="mt-1 text-[10px] leading-4 opacity-80">{signal.detail}</p>
      <button
        type="button"
        onClick={() => onNavigate(signal.actionDestination as Destination)}
        className="mt-2 text-[10px] font-extrabold underline-offset-2 hover:underline"
      >
        Review source <ArrowRight className="inline h-3 w-3" />
      </button>
    </article>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  return (
    <label className="grid gap-1.5 text-[10px] font-extrabold text-[#52695d]">
      <span>{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={event => onChange(event.target.value)}
          maxLength={1600}
          className="min-h-24 rounded-xl border border-[#d9e7df] bg-[#fbfdfb] px-3 py-2 text-xs font-normal leading-5 text-[#244236] outline-none transition focus:border-[#087158] focus:ring-2 focus:ring-[#087158]/10"
        />
      ) : (
        <input
          value={value}
          onChange={event => onChange(event.target.value)}
          maxLength={180}
          className="min-h-10 rounded-xl border border-[#d9e7df] bg-[#fbfdfb] px-3 text-xs font-normal text-[#244236] outline-none transition focus:border-[#087158] focus:ring-2 focus:ring-[#087158]/10"
        />
      )}
    </label>
  );
}
function PolicyItem({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-xl border border-[#d9e8df] bg-white p-3">
      <p className="text-[10px] font-extrabold text-[#345a48]">{title}</p>
      <p className="mt-1 text-[10px] leading-4 text-[#627b6e]">{detail}</p>
    </div>
  );
}
function AcademyLaunchReadiness({
  readiness,
  onNavigate,
}: {
  readiness: any;
  onNavigate: (destination: Destination) => void;
}) {
  const statusStyle: Record<string, string> = {
    ready: "border-[#bfe2cb] bg-[#f2fbf5] text-[#216044]",
    warning: "border-[#ead9a6] bg-[#fffaf0] text-[#785f2c]",
    blocked: "border-[#efc6be] bg-[#fff5f2] text-[#8d4137]",
  };
  const statusLabel: Record<string, string> = {
    ready: "READY",
    warning: "WARNING",
    blocked: "BLOCKED",
  };
  return (
    <section className="rounded-[1.4rem] border border-[#dce9e1] bg-white p-5 shadow-[0_10px_28px_rgba(25,58,42,.04)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-base font-extrabold text-[#284c3d]">
            Academy Launch Readiness
          </p>
          <p className="mt-1 max-w-2xl text-[11px] leading-5 text-[#6b8075]">
            This deterministic checklist reads current tenant configuration
            evidence only. It does not publish, activate a course, send a
            message, charge, enroll, issue a credential, or approve a launch.
          </p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-[10px] font-extrabold ${statusStyle[readiness.status] ?? statusStyle.warning}`}
        >
          {statusLabel[readiness.status] ?? "WARNING"}
        </span>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <ReadinessMetric
          label="Ready"
          value={readiness.summary.ready}
          tone="ready"
        />
        <ReadinessMetric
          label="Warnings"
          value={readiness.summary.warning}
          tone="warning"
        />
        <ReadinessMetric
          label="Blocked"
          value={readiness.summary.blocked}
          tone="blocked"
        />
      </div>
      <div className="mt-4 grid gap-2">
        {readiness.checks.map((check: any) => (
          <article
            key={check.id}
            className={`rounded-xl border p-3 ${statusStyle[check.status] ?? statusStyle.warning}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[11px] font-extrabold">{check.label}</p>
                  <span className="rounded-full bg-white/70 px-2 py-0.5 text-[9px] font-extrabold">
                    {statusLabel[check.status] ?? "WARNING"}
                  </span>
                </div>
                <p className="mt-1 max-w-3xl text-[10px] leading-4 opacity-90">
                  {check.detail}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate(check.destination)}
                className="shrink-0 text-[10px] font-extrabold underline-offset-2 hover:underline"
              >
                Review <ArrowRight className="inline h-3 w-3" />
              </button>
            </div>
          </article>
        ))}
      </div>
      <p className="mt-4 rounded-xl border border-[#d7e7dc] bg-[#f7fcf8] p-3 text-[10px] leading-5 text-[#527366]">
        A status of READY means only that the named configuration evidence is
        present. It is not a declaration that the academy, payments,
        communications, certificates, legal policies, or capacity are
        independently approved for public launch.
      </p>
    </section>
  );
}
function ReadinessMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  const colour: Record<string, string> = {
    ready: "text-[#216044]",
    warning: "text-[#785f2c]",
    blocked: "text-[#8d4137]",
  };
  return (
    <div className="rounded-xl border border-[#dce9e1] bg-[#fbfdfb] p-3">
      <p className={`text-xl font-black ${colour[tone] ?? colour.warning}`}>
        {value}
      </p>
      <p className="mt-1 text-[9px] font-extrabold uppercase tracking-[.08em] text-[#718279]">
        {label}
      </p>
    </div>
  );
}
function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="grid gap-1.5 text-[10px] font-extrabold text-[#52695d]">
      <span>{label}</span>
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className="min-h-11 rounded-xl border border-[#d9e7df] bg-[#fbfdfb] px-3 text-xs font-semibold text-[#244236] outline-none transition focus:border-[#087158] focus:ring-2 focus:ring-[#087158]/10"
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

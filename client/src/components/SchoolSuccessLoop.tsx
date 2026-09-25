import { ArrowRight, CalendarClock, CheckCircle2, CircleAlert, Compass, Sparkles } from "lucide-react";

type Destination = "overview" | "learning" | "admissions" | "finance" | "communications" | "automation" | "website" | "institution-builder";
type SuccessLoopData = {
  dashboard: { pendingAdmissions: number; attendanceRate: number; outstanding: number };
  attentionQueue: Array<{ title: string; detail: string; actionDestination?: string | null }>;
  healthSignals: Array<{ id: string; label: string; status: string; detail: string; actionDestination?: string | null }>;
  launchReadiness: { status: string };
  reviewSummary: { attention: number; review: number };
};

const money = (value: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(value);

export function SchoolSuccessLoop({ data, onNavigate }: { data: SuccessLoopData; onNavigate: (destination: Destination) => void }) {
  const actions = [
    data.dashboard.pendingAdmissions > 0 ? { title: "Clear admissions queue", value: String(data.dashboard.pendingAdmissions), detail: "Application(s) are waiting for school review.", destination: "admissions" as Destination } : null,
    data.dashboard.outstanding > 0 ? { title: "Review cash position", value: money(data.dashboard.outstanding), detail: "Outstanding balance currently recorded.", destination: "finance" as Destination } : null,
    data.dashboard.attendanceRate < 90 ? { title: "Check attendance", value: `${data.dashboard.attendanceRate}%`, detail: "Current attendance is below the 90% review cue.", destination: "overview" as Destination } : null,
    data.attentionQueue[0] ? { title: "Resolve priority review", value: "1", detail: data.attentionQueue[0].title, destination: (data.attentionQueue[0].actionDestination as Destination) || "overview" } : null,
  ].filter(Boolean) as Array<{ title: string; value: string; detail: string; destination: Destination }>;
  const stableSignals = data.healthSignals.filter(signal => signal.status === "healthy").length;
  const totalSignals = data.healthSignals.length;
  const reviewCount = data.reviewSummary.attention + data.reviewSummary.review;
  return <section className="rounded-[1.6rem] border border-[#d9e8df] bg-white p-5 shadow-[0_14px_36px_rgba(20,58,42,.05)] sm:p-6">
    <div className="flex flex-wrap items-end justify-between gap-3"><div>
      <div className="flex items-center gap-2 text-[#167457]"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#edf8f1]"><Sparkles className="h-4 w-4" /></span><p className="text-[10px] font-extrabold uppercase tracking-[.16em]">School Success Loop</p></div>
      <h2 className="mt-3 text-2xl font-black tracking-[-.04em] text-[#203d31]">Know. Review. Act. Return tomorrow.</h2>
      <p className="mt-2 max-w-2xl text-xs leading-5 text-[#718279]">A daily operating rhythm built from the school&apos;s current records. NSOS surfaces the next review; the school decides and executes the protected action.</p>
    </div><div className="flex flex-wrap gap-2 text-[9px] font-extrabold">
      <span className="inline-flex items-center gap-1 rounded-full border border-[#d9e8df] bg-[#f5faf7] px-3 py-1.5 text-[#286148]"><CalendarClock className="h-3 w-3" />Daily review</span>
      <span className="inline-flex items-center gap-1 rounded-full border border-[#d9e8df] bg-[#f5faf7] px-3 py-1.5 text-[#286148]"><Compass className="h-3 w-3" />{stableSignals}/{totalSignals || 0} stable</span>
      <span className="inline-flex items-center gap-1 rounded-full border border-[#d9e8df] bg-[#f5faf7] px-3 py-1.5 text-[#286148]"><CircleAlert className="h-3 w-3" />{reviewCount} review</span>
    </div></div>
    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{actions.length ? actions.map(action => <button key={action.title} type="button" onClick={() => onNavigate(action.destination)} className="group rounded-2xl border border-[#dce9e1] bg-[#fbfdfb] p-4 text-left transition hover:-translate-y-0.5 hover:border-[#9bd4bb] hover:shadow-[0_10px_24px_rgba(20,58,42,.06)]"><p className="text-[9px] font-extrabold uppercase tracking-[.1em] text-[#718279]">{action.title}</p><p className="mt-2 truncate text-xl font-black tracking-[-.035em] text-[#244b39]">{action.value}</p><p className="mt-1 line-clamp-2 text-[10px] leading-4 text-[#66776e]">{action.detail}</p><span className="mt-3 inline-flex items-center text-[9px] font-extrabold text-[#176b4d]">Review <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-0.5" /></span></button>) : <div className="rounded-2xl border border-[#c7e4d1] bg-[#f2fbf5] p-5 sm:col-span-2 xl:col-span-4"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#216044]" /><div><p className="text-sm font-extrabold text-[#216044]">No immediate exception surfaced.</p><p className="mt-1 text-[10px] leading-5 text-[#5f7569]">Keep the school running in NSOS. The next review changes when the underlying records change.</p></div></div></div>}</div>
    <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]"><div className="rounded-2xl border border-[#dce9e1] bg-[#f7fcf8] p-4"><p className="text-[9px] font-extrabold uppercase tracking-[.1em] text-[#718279]">Operating rhythm</p><div className="mt-3 grid gap-2 sm:grid-cols-3"><Rhythm label="Morning" detail="Review the surfaced exceptions." active /><Rhythm label="During the day" detail="Work through protected school workflows." /><Rhythm label="Close of day" detail="Return to the command centre for the next review." /></div></div>
      <div className="rounded-2xl border border-[#dce9e1] bg-[#102a24] p-4 text-white"><p className="text-[9px] font-extrabold uppercase tracking-[.1em] text-white/55">Launch readiness</p><p className="mt-2 text-lg font-black">{data.launchReadiness.status.toUpperCase()}</p><p className="mt-1 max-w-[220px] text-[10px] leading-4 text-white/60">Configuration evidence only. It is not an approval to publish or launch.</p></div></div>
  </section>;
}

function Rhythm({ label, detail, active = false }: { label: string; detail: string; active?: boolean }) {
  const className = active ? "border-[#b9dccc] bg-white" : "border-[#e2ece6] bg-transparent";
  return <div className={`rounded-xl border p-3 ${className}`}><p className="text-[10px] font-extrabold text-[#345a48]">{label}</p><p className="mt-1 text-[9px] leading-4 text-[#6d8277]">{detail}</p></div>;
}
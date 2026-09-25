import { Bell, CalendarDays, CheckCircle2, ClipboardCheck, FileText, ReceiptText, ShieldCheck } from "lucide-react";

type TrustEvent = {
  id: string;
  kind: "attendance" | "finance" | "notice" | "result" | "evidence";
  title: string;
  detail: string;
  date?: string | Date | null;
  status?: string;
};

function displayDate(value?: string | Date | null) {
  if (!value) return "Current";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Current";
  return new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric" }).format(parsed);
}

function tone(kind: TrustEvent["kind"]) {
  return {
    attendance: "bg-[#e5f1f2] text-[#216574]",
    finance: "bg-[#f8f1e3] text-[#8a5a12]",
    notice: "bg-[#edf3ed] text-[#0f5c4f]",
    result: "bg-[#eee9f8] text-[#644b8a]",
    evidence: "bg-[#f7e8e6] text-[#a13e38]",
  }[kind];
}

function icon(kind: TrustEvent["kind"]) {
  const Icon = {
    attendance: ClipboardCheck,
    finance: ReceiptText,
    notice: Bell,
    result: FileText,
    evidence: ShieldCheck,
  }[kind];
  return <Icon className="h-4 w-4" aria-hidden="true" />;
}

function buildEvents(data: any): TrustEvent[] {
  const events: TrustEvent[] = [];
  for (const item of data?.attendance ?? []) {
    const learner = item.student ? `${item.student.firstName ?? ""} ${item.student.lastName ?? ""}`.trim() : "Linked learner";
    events.push({
      id: `attendance-${item.id}`,
      kind: "attendance",
      title: `Attendance recorded: ${String(item.status).replaceAll("_", " ")}`,
      detail: learner,
      date: item.attendanceDate,
      status: item.status,
    });
  }
  for (const item of data?.invoices ?? []) {
    const outstanding = Math.max(0, Number(item.total ?? 0) - Number(item.amountPaid ?? 0));
    events.push({
      id: `invoice-${item.id}`,
      kind: "finance",
      title: `Invoice ${item.invoiceNo ?? "record"}`,
      detail: outstanding > 0 ? `Outstanding ${new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(outstanding)}` : "Recorded as paid",
      date: item.issueDate,
      status: item.status,
    });
  }
  for (const item of data?.announcements ?? []) {
    if (item.status !== "published") continue;
    events.push({
      id: `notice-${item.id}`,
      kind: "notice",
      title: item.title,
      detail: "Published school announcement",
      date: item.publishedAt ?? item.createdAt,
      status: "published",
    });
  }
  for (const item of data?.paymentEvidenceNotifications ?? []) {
    events.push({
      id: `evidence-${item.id}`,
      kind: "evidence",
      title: `Payment evidence ${item.decision}`,
      detail: "The school has recorded a finance review decision for submitted payment evidence.",
      date: item.createdAt,
      status: item.decision,
    });
  }
  return events
    .sort((a, b) => {
      const aTime = a.date ? new Date(a.date).getTime() : 0;
      const bTime = b.date ? new Date(b.date).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 12);
}

export function ParentTrustCentre({ data, paymentEvidenceNotifications = [] }: { data?: any; paymentEvidenceNotifications?: any[] }) {
  const timeline = buildEvents({ ...data, paymentEvidenceNotifications });
  return (
    <section className="overflow-hidden rounded-[1.4rem] border border-[#dce7df] bg-white shadow-[0_10px_28px_rgba(25,58,42,.04)]" aria-labelledby="parent-trust-centre-title">
      <div className="border-b border-[#e7ede8] bg-[#f7fbf8] px-5 py-5 sm:px-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#dcefe3] text-[#0f5c4f]"><ShieldCheck className="h-5 w-5" /></span>
          <div>
            <p className="mono text-[10px] font-semibold uppercase tracking-[.16em] text-[#4f7667]">Parent Trust Centre</p>
            <h2 id="parent-trust-centre-title" className="mt-1 text-xl font-bold tracking-[-.03em] text-[#203c31]">One trustworthy timeline for school life.</h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-[#6c7e75]">See published school updates, attendance records, fee activity and payment-evidence decisions from your linked family record. Only information already permitted to this portal is shown.</p>
          </div>
        </div>
      </div>
      {timeline.length ? (
        <div className="divide-y divide-[#edf0eb]">
          {timeline.map(item => (
            <article key={item.id} className="flex gap-3 px-5 py-4 sm:px-6">
              <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${tone(item.kind)}`}>{icon(item.kind)}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-[#30473b]">{item.title}</p>
                    <p className="mt-1 text-[11px] leading-5 text-[#718178]">{item.detail}</p>
                  </div>
                  <time className="inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold text-[#87938c]"><CalendarDays className="h-3 w-3" />{displayDate(item.date)}</time>
                </div>
              </div>
              {item.status && <span className="hidden shrink-0 rounded-full bg-[#f1f4f0] px-2 py-1 text-[9px] font-extrabold capitalize text-[#617168] sm:inline-flex">{String(item.status).replaceAll("_", " ")}</span>}
            </article>
          ))}
        </div>
      ) : (
        <div className="grid min-h-32 place-items-center px-6 py-8 text-center">
          <div>
            <CheckCircle2 className="mx-auto h-5 w-5 text-[#4e806b]" />
            <p className="mt-2 text-xs font-semibold text-[#385247]">Your trust timeline is ready.</p>
            <p className="mt-1 text-[10px] leading-5 text-[#758079]">New published school updates and linked records will appear here as they are recorded.</p>
          </div>
        </div>
      )}
    </section>
  );
}

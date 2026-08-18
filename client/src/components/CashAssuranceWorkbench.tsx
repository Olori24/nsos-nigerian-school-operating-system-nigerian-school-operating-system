import { useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, BadgeCheck, CircleDollarSign, FileClock, HandCoins, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const inputClass = "h-10 w-full rounded-lg border border-[#dfe5df] bg-white px-3 text-sm text-[#294239] outline-none transition focus:border-[#0f5c4f]";
const selectClass = inputClass;

const currency = (amount: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(amount || 0);

function LabelledField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-1.5"><span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#68776f]">{label}</span>{children}</label>;
}

function Tone({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "good" | "warn" | "danger" }) {
  const tones = { neutral: "bg-[#eef2ef] text-[#52665b]", good: "bg-[#e8f4e9] text-[#176145]", warn: "bg-[#fff4dc] text-[#956821]", danger: "bg-[#fee9e7] text-[#a44738]" };
  return <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold capitalize ${tones[tone]}`}>{children}</span>;
}

export function CashAssuranceWorkbench({ schoolId, invoices, payments, students, onDone }: { schoolId: number; invoices: any[]; payments: any[]; students: any[]; onDone: () => void }) {
  const utils = trpc.useUtils();
  const data = trpc.nsos.cashAssurance.list.useQuery({ schoolId });
  const [invoiceId, setInvoiceId] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "high" | "urgent">("normal");
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [action, setAction] = useState<"promise" | "evidence" | "dispute">("promise");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [source, setSource] = useState<"manual_receipt" | "bank_reference" | "provider_event" | "other">("bank_reference");
  const [reference, setReference] = useState("");

  const refresh = async () => {
    await utils.nsos.cashAssurance.list.invalidate({ schoolId });
    onDone();
  };
  const openCase = trpc.nsos.cashAssurance.openCase.useMutation({ onSuccess: async () => { toast.success("Cash Assurance case opened. No ledger record was changed."); setInvoiceId(""); await refresh(); }, onError: error => toast.error(error.message) });
  const promise = trpc.nsos.cashAssurance.recordPromise.useMutation({ onSuccess: async () => { toast.success("Payment promise recorded for finance follow-up."); setAmount(""); setNote(""); await refresh(); }, onError: error => toast.error(error.message) });
  const evidence = trpc.nsos.cashAssurance.submitEvidence.useMutation({ onSuccess: async () => { toast.success("Payment evidence submitted for review. It has not changed the ledger."); setAmount(""); setReference(""); setNote(""); await refresh(); }, onError: error => toast.error(error.message) });
  const dispute = trpc.nsos.cashAssurance.recordDispute.useMutation({ onSuccess: async () => { toast.success("Dispute recorded. Follow-up remains paused until resolved."); setNote(""); await refresh(); }, onError: error => toast.error(error.message) });
  const resolveDispute = trpc.nsos.cashAssurance.resolveDispute.useMutation({ onSuccess: async () => { toast.success("Dispute resolved and case returned to active review."); await refresh(); }, onError: error => toast.error(error.message) });
  const reviewEvidence = trpc.nsos.cashAssurance.reviewEvidence.useMutation({ onSuccess: async () => { toast.success("Evidence review recorded. Ledger records remain unchanged."); await refresh(); }, onError: error => toast.error(error.message) });

  const eligibleInvoices = useMemo(() => invoices.filter(invoice => invoice.status !== "void" && Number(invoice.total) - Number(invoice.amountPaid) > 0.009), [invoices]);
  const selectedInvoice = eligibleInvoices.find(item => String(item.id) === invoiceId);
  const selectedCase = data.data?.cases?.find((item: any) => String(item.id) === selectedCaseId);
  const linkedInvoice = selectedCase?.invoices?.[0];
  const studentName = (studentId: number) => {
    const student = students.find(item => item.id === studentId);
    return student ? `${student.firstName} ${student.lastName}` : `Student #${studentId}`;
  };

  const submitCase = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedInvoice) return toast.error("Select an outstanding invoice.");
    openCase.mutate({ schoolId, invoiceId: selectedInvoice.id, studentId: selectedInvoice.studentId, priority });
  };
  const submitAction = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedCase || !linkedInvoice) return toast.error("Select a linked Cash Assurance case.");
    if (action === "promise") promise.mutate({ schoolId, caseId: selectedCase.id, promisedAmount: Number(amount), promisedOn: date, note: note || undefined });
    if (action === "evidence") evidence.mutate({ schoolId, caseId: selectedCase.id, invoiceId: linkedInvoice.id, amountClaimed: Number(amount), source, providerReference: reference || undefined, note: note || undefined });
    if (action === "dispute") dispute.mutate({ schoolId, caseId: selectedCase.id, note });
  };

  const dashboard = data.data?.dashboard;
  const reviewableEvidence = data.data?.paymentEvidence?.filter((item: any) => item.status === "submitted" || item.status === "under_review") ?? [];

  return <section className="grid gap-5" aria-label="Cash Assurance control workbench">
    <div className="rounded-2xl border border-[#cce2d0] bg-[#f5fbf5] p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#0f5c4f] text-white"><ShieldCheck className="h-4 w-4" /></span><div><p className="text-sm font-semibold text-[#1c4033]">Cash Assurance</p><p className="mt-0.5 text-xs text-[#587267]">Controlled finance follow-up. Cases and evidence never post a payment or change an invoice.</p></div></div></div><Tone tone="good">Ledger-protected</Tone></div></div>

    {data.isLoading ? <div className="rounded-2xl border border-[#e1e8e1] bg-white p-6 text-sm text-[#6d7d74]">Loading Cash Assurance controls…</div> : data.error ? <div className="rounded-2xl border border-[#f0c9c3] bg-[#fff5f3] p-5 text-sm text-[#914939]">Cash Assurance could not be loaded: {data.error.message}</div> : <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric icon={CircleDollarSign} label="Outstanding" value={currency(dashboard?.outstanding ?? 0)} detail="Across issued invoices" tone="pine" />
        <Metric icon={AlertTriangle} label="Overdue" value={currency(dashboard?.overdue ?? 0)} detail="Requires finance attention" tone="gold" />
        <Metric icon={HandCoins} label="Active cases" value={String(dashboard?.activeCases ?? 0)} detail="Controlled follow-up" tone="sky" />
        <Metric icon={BadgeCheck} label="Priority cases" value={String(dashboard?.highPriorityCases ?? 0)} detail="High or urgent" tone="rose" />
        <Metric icon={FileClock} label="Evidence review" value={String(dashboard?.evidenceUnderReview ?? 0)} detail="No payment posted yet" tone="sage" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[.85fr_1.15fr]"><div className="rounded-2xl border border-[#e1e8e1] bg-white p-5"><p className="text-sm font-semibold text-[#294239]">Open a controlled case</p><p className="mt-1 text-xs leading-5 text-[#758079]">Link one outstanding invoice to a finance follow-up case. This does not edit the invoice, balance, or receipt history.</p><form onSubmit={submitCase} className="mt-5 grid gap-3"><LabelledField label="Outstanding invoice"><select required className={selectClass} value={invoiceId} onChange={event => setInvoiceId(event.target.value)}><option value="">Select invoice</option>{eligibleInvoices.map(invoice => <option key={invoice.id} value={invoice.id}>{invoice.invoiceNo} · {studentName(invoice.studentId)} · {currency(Number(invoice.total) - Number(invoice.amountPaid))}</option>)}</select></LabelledField><LabelledField label="Follow-up priority"><select className={selectClass} value={priority} onChange={event => setPriority(event.target.value as typeof priority)}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></LabelledField><button disabled={openCase.isPending} className="mt-1 rounded-xl bg-[#0f5c4f] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">{openCase.isPending ? "Opening case…" : "Open Cash Assurance case"}</button></form></div>

        <div className="rounded-2xl border border-[#e1e8e1] bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-[#294239]">Case activity</p><p className="mt-1 text-xs text-[#758079]">Record a promise, submit evidence for review, or pause follow-up through a documented dispute.</p></div>{selectedCase && <Tone tone={selectedCase.status === "disputed" ? "warn" : "neutral"}>{String(selectedCase.status).replaceAll("_", " ")}</Tone>}</div><div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]"><LabelledField label="Active case"><select className={selectClass} value={selectedCaseId} onChange={event => setSelectedCaseId(event.target.value)}><option value="">Select case</option>{data.data?.cases?.filter((item: any) => item.status !== "settled" && item.status !== "closed").map((item: any) => <option key={item.id} value={item.id}>#{item.id} · {studentName(item.studentId)} · {currency(item.outstanding)} · {item.status}</option>)}</select></LabelledField><div className="flex flex-wrap gap-1 self-end"><button type="button" onClick={() => setAction("promise")} className={`rounded-lg px-2.5 py-2 text-xs font-semibold ${action === "promise" ? "bg-[#0f5c4f] text-white" : "bg-[#f1f4f0] text-[#64736c]"}`}>Promise</button><button type="button" onClick={() => setAction("evidence")} className={`rounded-lg px-2.5 py-2 text-xs font-semibold ${action === "evidence" ? "bg-[#0f5c4f] text-white" : "bg-[#f1f4f0] text-[#64736c]"}`}>Evidence</button><button type="button" onClick={() => setAction("dispute")} className={`rounded-lg px-2.5 py-2 text-xs font-semibold ${action === "dispute" ? "bg-[#0f5c4f] text-white" : "bg-[#f1f4f0] text-[#64736c]"}`}>Dispute</button></div></div>{selectedCase && <form onSubmit={submitAction} className="mt-4 grid gap-3 rounded-xl bg-[#fafcf9] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-semibold text-[#2d453a]">{studentName(selectedCase.studentId)} · {linkedInvoice?.invoiceNo ?? "No linked invoice"}</span><span className="text-xs font-bold text-[#0f5c4f]">{currency(selectedCase.outstanding)}</span></div>{action !== "dispute" && <><div className="grid gap-3 sm:grid-cols-2"><LabelledField label={action === "promise" ? "Promised amount" : "Claimed amount"}><input required type="number" min="1" max={selectedCase.outstanding} className={inputClass} value={amount} onChange={event => setAmount(event.target.value)} /></LabelledField>{action === "promise" ? <LabelledField label="Promised date"><input required type="date" className={inputClass} value={date} onChange={event => setDate(event.target.value)} /></LabelledField> : <LabelledField label="Evidence source"><select className={selectClass} value={source} onChange={event => setSource(event.target.value as typeof source)}><option value="bank_reference">Bank reference</option><option value="manual_receipt">Manual receipt</option><option value="provider_event">Provider event</option><option value="other">Other</option></select></LabelledField>}</div>{action === "evidence" && <LabelledField label="Reference (optional)"><input className={inputClass} value={reference} onChange={event => setReference(event.target.value)} placeholder="Transfer or provider reference" /></LabelledField>}</>}<LabelledField label={action === "dispute" ? "Reason for pause" : "Finance note (optional)"}><textarea required={action === "dispute"} className="min-h-20 w-full rounded-lg border border-[#dfe5df] bg-white px-3 py-2 text-sm text-[#294239] outline-none focus:border-[#0f5c4f]" value={note} onChange={event => setNote(event.target.value)} /></LabelledField><button disabled={!selectedCase || promise.isPending || evidence.isPending || dispute.isPending || (selectedCase.status === "disputed" && action !== "dispute")} className="w-fit rounded-xl bg-[#123b31] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{action === "promise" ? "Record promise" : action === "evidence" ? "Submit evidence for review" : "Record dispute & pause follow-up"}</button></form>}{selectedCase?.status === "disputed" && <button onClick={() => resolveDispute.mutate({ schoolId, caseId: selectedCase.id })} className="mt-3 text-xs font-semibold text-[#0f5c4f] underline underline-offset-4">Resolve dispute and return to active review</button>}</div></div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]"><div className="overflow-hidden rounded-2xl border border-[#e1e8e1] bg-white"><div className="border-b border-[#edf0eb] px-5 py-4"><p className="text-sm font-semibold text-[#294239]">Collection cases</p><p className="mt-1 text-xs text-[#758079]">Balances are calculated from the existing invoice ledger.</p></div>{data.data?.cases?.length ? <div>{data.data.cases.map((item: any) => <div key={item.id} className="flex flex-col gap-3 border-b border-[#edf0eb] px-5 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-[#31483d]">{studentName(item.studentId)}</p><Tone tone={item.status === "disputed" ? "warn" : item.priority === "urgent" ? "danger" : item.priority === "high" ? "warn" : "neutral"}>{item.priority}</Tone><Tone tone={item.status === "settled" ? "good" : "neutral"}>{String(item.status).replaceAll("_", " ")}</Tone></div><p className="mono mt-1 text-[10px] text-[#7a847e]">{item.invoices.map((invoice: any) => invoice.invoiceNo).join(", ") || "No invoice linked"}</p>{item.pausedReason && <p className="mt-1 text-xs text-[#a26b1e]">Follow-up paused: {item.pausedReason}</p>}</div><div className="text-left sm:text-right"><p className="text-sm font-bold text-[#0f5c4f]">{currency(item.outstanding)}</p><p className="mt-1 text-[10px] text-[#7a847e]">Case #{item.id}</p></div></div>)}</div> : <div className="p-5 text-sm text-[#758079]">No Cash Assurance cases are open. Open one from an outstanding invoice when follow-up should be controlled and traceable.</div>}</div>

        <div className="overflow-hidden rounded-2xl border border-[#e1e8e1] bg-white"><div className="border-b border-[#edf0eb] px-5 py-4"><p className="text-sm font-semibold text-[#294239]">Payment evidence review</p><p className="mt-1 text-xs text-[#758079]">Accept only after linking a validated, recorded payment.</p></div>{reviewableEvidence.length ? <div>{reviewableEvidence.map((item: any) => { const validPayments = payments.filter(payment => payment.invoiceId === item.invoiceId); return <div key={item.id} className="border-b border-[#edf0eb] px-5 py-4 last:border-0"><div className="flex justify-between gap-3"><div><p className="text-sm font-semibold text-[#30463b]">Evidence #{item.id} · {currency(Number(item.amountClaimed))}</p><p className="mt-1 text-[10px] capitalize text-[#7a847e]">{item.source.replaceAll("_", " ")} · Invoice #{item.invoiceId}</p></div><Tone tone="warn">Awaiting review</Tone></div><div className="mt-3 flex flex-wrap gap-2"><select id={`payment-${item.id}`} className="h-9 min-w-44 rounded-lg border border-[#dfe5df] bg-white px-2 text-xs" defaultValue=""><option value="">Link recorded payment</option>{validPayments.map(payment => <option value={payment.id} key={payment.id}>{payment.receiptNo} · {currency(Number(payment.amount))}</option>)}</select><button onClick={() => { const select = document.getElementById(`payment-${item.id}`) as HTMLSelectElement | null; reviewEvidence.mutate({ schoolId, evidenceId: item.id, status: "accepted", linkedPaymentId: Number(select?.value || 0) || undefined }); }} className="rounded-lg bg-[#0f5c4f] px-3 py-2 text-xs font-semibold text-white">Accept</button><button onClick={() => reviewEvidence.mutate({ schoolId, evidenceId: item.id, status: "rejected" })} className="rounded-lg border border-[#dfc0bb] px-3 py-2 text-xs font-semibold text-[#a34d3d]">Reject</button></div></div>; })}</div> : <div className="p-5 text-sm text-[#758079]">No payment evidence is waiting for review.</div>}</div></div>
    </>}
  </section>;
}

function Metric({ icon: Icon, label, value, detail, tone }: { icon: typeof CircleDollarSign; label: string; value: string; detail: string; tone: "pine" | "gold" | "sky" | "rose" | "sage" }) {
  const colour = { pine: "bg-[#e8f3eb] text-[#0f5c4f]", gold: "bg-[#fff3d7] text-[#9b701f]", sky: "bg-[#e8f3f7] text-[#26718a]", rose: "bg-[#fee9e7] text-[#b0493d]", sage: "bg-[#edf1ea] text-[#587060]" }[tone];
  return <div className="rounded-2xl border border-[#e1e8e1] bg-white p-4"><span className={`grid h-8 w-8 place-items-center rounded-xl ${colour}`}><Icon className="h-4 w-4" /></span><p className="mt-4 text-xl font-semibold tracking-[-0.03em] text-[#203b30]">{value}</p><p className="mt-1 text-xs font-semibold text-[#40594d]">{label}</p><p className="mt-1 text-[10px] text-[#7a8780]">{detail}</p></div>;
}

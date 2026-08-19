import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { AlertCircle, Download, FileUp, HandCoins, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const inputClass = "h-10 w-full rounded-lg border border-[#dfe5df] bg-white px-3 text-sm text-[#294239] outline-none transition focus:border-[#0f5c4f]";
const currency = (amount: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(amount || 0);

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "good" | "warn" | "danger" }) {
  const tones = { neutral: "bg-[#eef2ef] text-[#52665b]", good: "bg-[#e8f4e9] text-[#176145]", warn: "bg-[#fff4dc] text-[#956821]", danger: "bg-[#fee9e7] text-[#a44738]" };
  return <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold capitalize ${tones[tone]}`}>{children}</span>;
}

const fileToBase64 = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error("The selected document could not be read."));
  reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
  reader.readAsDataURL(file);
});

function evidenceOutcome(status: string) {
  if (status === "accepted") return { label: "Approved", tone: "good" as const, detail: "Finance has matched this evidence to a recorded payment." };
  if (status === "rejected") return { label: "Rejected", tone: "danger" as const, detail: "Finance could not match this evidence to a recorded payment. Review your document or contact the school finance team." };
  return { label: "Pending review", tone: "warn" as const, detail: "Your evidence is with the school finance team. Your balance will not change until they complete their review." };
}

function displayDate(value?: string | Date | null) {
  return value ? new Date(value).toLocaleDateString() : "—";
}

const statementMoney = (amount: number) => `NGN ${new Intl.NumberFormat("en-NG", { maximumFractionDigits: 2 }).format(amount || 0)}`;

export function FamilyCashAssurance({ schoolId, role, onDone }: { schoolId: number; role: "parent" | "student"; onDone: () => void }) {
  const utils = trpc.useUtils();
  const query = trpc.nsos.portal.cashAssurance.useQuery({ schoolId });
  const [caseId, setCaseId] = useState("");
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState("");
  const [source, setSource] = useState<"manual_receipt" | "bank_reference" | "provider_event" | "other">("bank_reference");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [scanResult, setScanResult] = useState<{ amountNgn: number | null; paidOn: string | null; confidence: "low" | "medium" | "high"; requiresConfirmation: boolean } | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isBuildingStatement, setIsBuildingStatement] = useState(false);
  const [statementError, setStatementError] = useState<string | null>(null);

  const selectedCase = useMemo(() => query.data?.cases.find((item: any) => String(item.id) === caseId), [caseId, query.data]);
  const selectedInvoice = selectedCase?.invoices?.[0];
  const evidenceRows = query.data?.paymentEvidence ?? [];
  const totalOutstanding = (query.data?.cases ?? []).reduce((sum: number, item: any) => sum + Number(item.outstanding ?? 0), 0);
  const pendingEvidence = evidenceRows.filter((item: any) => item.status === "submitted" || item.status === "under_review");
  const pendingEvidenceAmount = pendingEvidence.reduce((sum: number, item: any) => sum + Number(item.amountClaimed ?? 0), 0);
  const paymentHistory = query.data?.paymentHistory ?? [];

  const downloadStatement = async () => {
    setStatementError(null);
    setIsBuildingStatement(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const margin = 42;
      const pageHeight = doc.internal.pageSize.getHeight();
      let y = 50;
      const ensureSpace = (needed = 22) => { if (y + needed > pageHeight - 44) { doc.addPage(); y = 48; } };
      const write = (text: string, options: { size?: number; bold?: boolean; color?: [number, number, number]; gap?: number } = {}) => {
        const size = options.size ?? 10;
        const lines = doc.splitTextToSize(text, 510);
        ensureSpace(lines.length * (size + 4) + 4);
        doc.setFont("helvetica", options.bold ? "bold" : "normal");
        doc.setFontSize(size);
        doc.setTextColor(...(options.color ?? [47, 71, 59]));
        doc.text(lines, margin, y);
        y += lines.length * (size + 4) + (options.gap ?? 6);
      };
      const rule = () => { ensureSpace(12); doc.setDrawColor(220, 230, 222); doc.line(margin, y, 553, y); y += 14; };
      const heading = (text: string) => { ensureSpace(30); doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(20, 74, 59); doc.text(text, margin, y); y += 20; };
      const paymentText = (payment: any) => {
        const learner = payment.student ? `${payment.student.firstName} ${payment.student.lastName}` : "Linked learner";
        const method = String(payment.method).replaceAll("_", " ");
        return `${displayDate(payment.paidOn)}  |  ${statementMoney(Number(payment.amount))}  |  ${learner}  |  Receipt ${payment.receiptNo}${payment.invoiceNo ? `  |  Invoice ${payment.invoiceNo}` : ""}  |  ${method}`;
      };

      doc.setFillColor(15, 92, 79); doc.rect(0, 0, 595, 92, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.setTextColor(255, 255, 255); doc.text("NSOS", margin, 42);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.text("NIGERIAN SCHOOL OPERATING SYSTEM", margin, 59);
      doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.text("Family Finance Statement", margin, 78);
      y = 122;
      write(`Generated ${new Date().toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}`, { size: 9, color: [102, 120, 109], gap: 12 });
      heading("Current position");
      write(`Total outstanding balance: ${statementMoney(totalOutstanding)}`, { size: 12, bold: true, color: [24, 59, 46], gap: 4 });
      write(`Payment evidence awaiting finance review: ${statementMoney(pendingEvidenceAmount)} across ${pendingEvidence.length} submission${pendingEvidence.length === 1 ? "" : "s"}. Pending evidence is not deducted from the outstanding balance until finance completes its review.`, { size: 9, color: [92, 109, 99], gap: 12 });
      rule();
      heading("Confirmed payment history");
      if (paymentHistory.length) paymentHistory.forEach((payment: any) => write(paymentText(payment), { size: 9, gap: 7 }));
      else write("No confirmed payments are available for the learners linked to this portal account.", { size: 9, color: [102, 120, 109], gap: 12 });
      rule();
      heading("Payment evidence status");
      if (evidenceRows.length) evidenceRows.forEach((evidence: any) => {
        const outcome = evidenceOutcome(evidence.status);
        write(`${displayDate(evidence.createdAt)}  |  ${statementMoney(Number(evidence.amountClaimed))}  |  ${outcome.label}  |  Payment date ${displayDate(evidence.claimedPaidOn)}`, { size: 9, bold: true, gap: 2 });
        write(outcome.detail, { size: 8, color: [102, 120, 109], gap: 7 });
      });
      else write("No payment evidence has been submitted from this portal account.", { size: 9, color: [102, 120, 109], gap: 12 });
      rule();
      write("This statement is generated from the signed-in family portal. It is an information summary, not a payment receipt or a final finance decision. Contact the school finance office if you need help with a payment record.", { size: 8, color: [102, 120, 109], gap: 0 });
      doc.save(`nsos-family-statement-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch {
      setStatementError("The statement could not be generated in this browser. Please try again, or contact the school finance office for assistance.");
    } finally { setIsBuildingStatement(false); }
  };
  const submit = trpc.nsos.portal.submitPaymentEvidence.useMutation({
    onSuccess: async () => {
      toast.success("Payment evidence was sent to the school finance team for review. Your balance has not been changed automatically.");
      setAmount(""); setPaidOn(""); setReference(""); setNote(""); setFile(null); setScanResult(null); setScanError(null);
      await utils.nsos.portal.cashAssurance.invalidate({ schoolId });
      onDone();
    },
    onError: error => toast.error(error.message),
  });
  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    if (!selected) return setFile(null);
    if (!(["image/jpeg", "image/png", "image/webp", "application/pdf"] as string[]).includes(selected.type)) return toast.error("Use a JPG, PNG, WEBP, or PDF document.");
    if (selected.size > 5 * 1024 * 1024) return toast.error("Payment evidence must be 5 MB or smaller.");
    setFile(selected); setScanResult(null); setScanError(null);
  };
  const scanReceipt = trpc.nsos.portal.scanPaymentEvidence.useMutation({
    onSuccess: result => {
      if (!result.amountNgn || !result.paidOn) {
        setScanResult(null);
        setScanError("We could not read a clear payment amount and date from this document. Try a brighter, uncropped image or enter both values manually.");
        toast.error("The receipt scan needs a clearer document. You can enter the payment details manually.");
        return;
      }
      setScanResult(result);
      setAmount(String(result.amountNgn));
      setPaidOn(result.paidOn);
      setScanError(null);
      toast.success("Receipt scanned. Confirm or edit the suggested amount and date before sending it to finance.");
    },
    onError: error => {
      setScanResult(null);
      setScanError("We could not read this document with AI. Check that the receipt is clear and complete, then scan again—or enter the amount and payment date manually.");
      toast.error(`${error.message} You can still enter the amount and payment date manually.`);
    },
  });
  const startReceiptScan = async () => {
    if (!selectedCase || !selectedInvoice || !file) return toast.error("Select a payment case and document before scanning.");
    try {
      setScanError(null); setScanResult(null);
      const base64 = await fileToBase64(file);
      if (!base64) throw new Error("The selected document could not be read.");
      scanReceipt.mutate({ schoolId, caseId: selectedCase.id, invoiceId: selectedInvoice.id, upload: { base64, fileName: file.name, mimeType: file.type as "image/jpeg" | "image/png" | "image/webp" | "application/pdf" } });
    } catch (error) {
      setScanError("We could not prepare this document for scanning. Select the file again or enter the amount and payment date manually.");
      toast.error(error instanceof Error ? error.message : "The receipt scan could not be prepared.");
    }
  };
  const submitEvidence = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedCase || !selectedInvoice) return toast.error("Select the payment case you are responding to.");
    if (!file) return toast.error("Attach your receipt, transfer confirmation, or payment document.");
    try {
      const base64 = await fileToBase64(file);
      if (!base64) throw new Error("The selected document could not be read.");
      submit.mutate({ schoolId, caseId: selectedCase.id, invoiceId: selectedInvoice.id, amountClaimed: Number(amount), claimedPaidOn: paidOn || undefined, source, providerReference: reference || undefined, note: note || undefined, upload: { base64, fileName: file.name, mimeType: file.type as "image/jpeg" | "image/png" | "image/webp" | "application/pdf" } });
    } catch (error) { toast.error(error instanceof Error ? error.message : "The payment document could not be prepared."); }
  };

  if (query.isLoading) return <section className="rounded-2xl border border-[#e1e8e1] bg-white p-5 text-sm text-[#758079]">Loading payment promises and evidence…</section>;
  if (query.error) return <section className="rounded-2xl border border-[#f0c9c3] bg-[#fff5f3] p-5 text-sm text-[#914939]">Payment support could not be loaded: {query.error.message}</section>;

  return <section className="grid gap-5" aria-label="Payment promises and evidence">
    <div className="rounded-2xl border border-[#cce2d0] bg-[#f5fbf5] p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0f5c4f] text-white"><HandCoins className="h-4 w-4" /></span><div><p className="text-sm font-semibold text-[#1c4033]">Payment promises & evidence</p><p className="mt-1 max-w-2xl text-xs leading-5 text-[#587267]">View payment commitments for {role === "parent" ? "your linked learners" : "your school account"} and send proof of payment directly to the finance team.</p></div></div><Badge tone="good">Finance reviewed</Badge></div><p className="mt-4 flex items-center gap-2 text-[11px] text-[#567466]"><ShieldCheck className="h-3.5 w-3.5" />Submitting evidence does not record a payment or change your balance. The school must review it first.</p></div>

    <div className="grid gap-4 sm:grid-cols-2"><div className="rounded-2xl border border-[#e1e8e1] bg-white p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#728178]">Total outstanding balance</p><p className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-[#193b2e]">{currency(totalOutstanding)}</p><p className="mt-1 text-xs leading-5 text-[#758079]">Across the payment cases available to this portal account.</p></div><div className="rounded-2xl border border-[#e7d9b8] bg-[#fffaf0] p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8b6d2e]">Evidence pending review</p><p className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-[#6f551a]">{currency(pendingEvidenceAmount)}</p><p className="mt-1 text-xs leading-5 text-[#8a7346]">{pendingEvidence.length} submission{pendingEvidence.length === 1 ? "" : "s"} awaiting finance review. This is not yet deducted from the outstanding balance.</p></div></div>
    <div className="flex flex-col gap-3 rounded-2xl border border-[#dce7de] bg-white p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-[#294239]">Family finance statement</p><p className="mt-1 text-xs text-[#758079]">Download your current balance, confirmed payment history, and payment-evidence status as a PDF.</p></div><button type="button" onClick={downloadStatement} disabled={isBuildingStatement} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0f5c4f] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"><Download className="h-4 w-4" />{isBuildingStatement ? "Preparing statement…" : "Download statement"}</button></div>
    {statementError && <div role="alert" className="rounded-xl border border-[#f0c9c3] bg-[#fff5f3] px-4 py-3 text-xs leading-5 text-[#9a5a4d]">{statementError}</div>}

    <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]"><div className="overflow-hidden rounded-2xl border border-[#e1e8e1] bg-white"><div className="border-b border-[#edf0eb] px-5 py-4"><p className="text-sm font-semibold text-[#294239]">Your payment cases</p><p className="mt-1 text-xs text-[#758079]">Only cases linked to your own learner record are shown here.</p></div>{query.data?.cases?.length ? <div>{query.data.cases.map((item: any) => <div key={item.id} className="border-b border-[#edf0eb] px-5 py-4 last:border-0"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-[#30473b]">{item.student ? `${item.student.firstName} ${item.student.lastName}` : "Linked learner"}</p><Badge tone={item.status === "disputed" ? "warn" : item.status === "settled" ? "good" : "neutral"}>{String(item.status).replaceAll("_", " ")}</Badge></div><p className="mono mt-1 text-[10px] text-[#7a847e]">{item.invoices.map((invoice: any) => invoice.invoiceNo).join(", ")}</p>{item.pausedReason && <p className="mt-2 text-xs text-[#a26b1e]">Finance follow-up is paused while a school dispute is reviewed.</p>}</div><p className="text-sm font-bold text-[#0f5c4f]">{currency(item.outstanding)}</p></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{item.promises?.length ? <div className="rounded-lg bg-[#fafcf9] p-3"><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#758079]">Latest payment promise</p>{item.promises.slice(0, 1).map((promise: any) => <p key={promise.id} className="mt-1 text-xs font-semibold text-[#40584d]">{currency(promise.promisedAmount)} by {new Date(promise.promisedOn).toLocaleDateString()}</p>)}</div> : <div className="rounded-lg bg-[#fafcf9] p-3 text-xs text-[#758079]">No payment promise has been recorded.</div>}<div className="rounded-lg bg-[#fafcf9] p-3"><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#758079]">Evidence status</p>{item.evidence?.length ? <div className="mt-1 flex flex-wrap gap-1">{item.evidence.slice(0, 3).map((evidence: any) => <Badge key={evidence.id} tone={evidence.status === "accepted" ? "good" : evidence.status === "rejected" ? "danger" : "warn"}>{evidence.status.replaceAll("_", " ")}</Badge>)}</div> : <p className="mt-1 text-xs text-[#758079]">No evidence submitted.</p>}</div></div></div>)}</div> : <div className="p-5 text-sm text-[#758079]">There are no payment promises or evidence requests linked to this portal account.</div>}</div>

      <div className="rounded-2xl border border-[#e1e8e1] bg-white p-5"><div className="flex items-start gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#edf3ed] text-[#0f5c4f]"><FileUp className="h-4 w-4" /></span><div><p className="text-sm font-semibold text-[#294239]">Upload payment evidence</p><p className="mt-1 text-xs leading-5 text-[#758079]">Attach a receipt, bank-transfer confirmation, or provider document. Accepted types: JPG, PNG, WEBP, or PDF, up to 5 MB.</p></div></div><form onSubmit={submitEvidence} className="mt-5 grid gap-3"><label className="grid gap-1.5"><span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#68776f]">Payment case</span><select required className={inputClass} value={caseId} onChange={event => { setCaseId(event.target.value); setScanResult(null); setScanError(null); }}><option value="">Select payment case</option>{query.data?.cases?.filter((item: any) => item.status !== "settled" && item.status !== "closed" && item.status !== "disputed" && item.invoices?.length).map((item: any) => <option value={item.id} key={item.id}>#{item.id} · {item.student ? `${item.student.firstName} ${item.student.lastName}` : "Linked learner"} · {currency(item.outstanding)}</option>)}</select></label><div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1.5"><span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#68776f]">Amount paid</span><input required type="number" min="1" max={selectedCase?.outstanding ?? undefined} className={inputClass} value={amount} onChange={event => setAmount(event.target.value)} /></label><label className="grid gap-1.5"><span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#68776f]">Payment date</span><input required type="date" className={inputClass} value={paidOn} onChange={event => setPaidOn(event.target.value)} /></label></div><label className="grid gap-1.5"><span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#68776f]">Payment type</span><select className={inputClass} value={source} onChange={event => setSource(event.target.value as typeof source)}><option value="bank_reference">Bank transfer</option><option value="manual_receipt">Receipt</option><option value="provider_event">Payment provider</option><option value="other">Other</option></select></label><label className="grid gap-1.5"><span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#68776f]">Reference (optional)</span><input className={inputClass} value={reference} onChange={event => setReference(event.target.value)} placeholder="Transfer or payment reference" /></label><label className="grid gap-1.5"><span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#68776f]">Payment document</span><input required type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="block w-full text-xs text-[#68776f] file:mr-3 file:rounded-lg file:border-0 file:bg-[#edf3ed] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#0f5c4f]" onChange={chooseFile} /></label>{file && <div className="rounded-xl bg-[#fafcf9] p-3"><p className="text-[11px] text-[#567466]">Selected: {file.name} · {(file.size / 1024).toFixed(0)} KB</p><button type="button" onClick={startReceiptScan} disabled={scanReceipt.isPending || !selectedCase} className="mt-2 inline-flex items-center gap-2 rounded-lg border border-[#bad8c2] bg-white px-3 py-2 text-xs font-semibold text-[#0f5c4f] disabled:cursor-not-allowed disabled:opacity-50"><Sparkles className="h-3.5 w-3.5" />{scanReceipt.isPending ? "Scanning receipt…" : "Scan receipt with AI"}</button></div>}{scanReceipt.isPending && <div role="status" aria-live="polite" className="rounded-xl border border-[#d7e6d9] bg-[#f7fbf7] p-3"><div className="flex items-center gap-2 text-xs font-semibold text-[#315945]"><Sparkles className="h-3.5 w-3.5 animate-pulse" />Reading your receipt securely…</div><div className="mt-3 grid gap-2"><div className="h-3 w-2/5 animate-pulse rounded bg-[#dce9de]" /><div className="h-9 w-full animate-pulse rounded-lg bg-[#e8f1e9]" /><div className="h-9 w-full animate-pulse rounded-lg bg-[#e8f1e9]" /></div><p className="mt-3 text-[11px] text-[#637c6d]">We are looking for the payment amount and date. You can still enter or change them yourself.</p></div>}{scanError && <div role="alert" className="rounded-xl border border-[#f0c9c3] bg-[#fff5f3] p-3"><div className="flex items-start gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#b34d3d]" /><div><p className="text-xs font-semibold text-[#8f4033]">Receipt scan needs your help</p><p className="mt-1 text-[11px] leading-5 text-[#9a5a4d]">{scanError}</p><button type="button" onClick={startReceiptScan} disabled={scanReceipt.isPending || !file || !selectedCase} className="mt-2 text-[11px] font-semibold text-[#9a4033] underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-50">Try scanning again</button></div></div></div>}{scanResult && <div className="rounded-xl border border-[#cce2d0] bg-[#f5fbf5] p-3"><div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold text-[#1c4033]">AI suggestion — please confirm</p><Badge tone={scanResult.confidence === "high" ? "good" : "warn"}>{scanResult.confidence} confidence</Badge></div><p className="mt-1 text-[11px] leading-5 text-[#587267]">Suggested amount and date have been placed in the form. Edit them if needed; finance will still review the evidence before any payment decision.</p></div>}<label className="grid gap-1.5"><span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#68776f]">Note (optional)</span><textarea className="min-h-20 w-full rounded-lg border border-[#dfe5df] bg-white px-3 py-2 text-sm text-[#294239] outline-none focus:border-[#0f5c4f]" value={note} onChange={event => setNote(event.target.value)} placeholder="Optional context for the finance team" /></label><button disabled={submit.isPending || !selectedCase} className="rounded-xl bg-[#0f5c4f] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{submit.isPending ? "Sending to finance…" : "Confirm & send evidence for review"}</button></form></div></div>
    <section className="overflow-hidden rounded-2xl border border-[#e1e8e1] bg-white" aria-label="Submitted payment evidence status">
      <div className="border-b border-[#edf0eb] px-5 py-4"><p className="text-sm font-semibold text-[#294239]">Submitted payment evidence</p><p className="mt-1 text-xs text-[#758079]">Track the finance-review outcome for documents submitted from this portal.</p></div>
      {evidenceRows.length ? <div>{evidenceRows.map((evidence: any) => {
        const outcome = evidenceOutcome(evidence.status);
        const relatedCase = query.data?.cases.find((item: any) => item.id === evidence.caseId);
        const learner = relatedCase?.student ? `${relatedCase.student.firstName} ${relatedCase.student.lastName}` : "Linked learner";
        return <div key={evidence.id} className="grid gap-3 border-b border-[#edf0eb] px-5 py-4 last:border-0 sm:grid-cols-[1fr_auto]"><div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-[#30473b]">{currency(Number(evidence.amountClaimed))} · {learner}</p><Badge tone={outcome.tone}>{outcome.label}</Badge></div><p className="mt-1 text-[11px] text-[#758079]">Submitted {displayDate(evidence.createdAt)} · Payment date {displayDate(evidence.claimedPaidOn)} · {String(evidence.source).replaceAll("_", " ")}</p><p className="mt-2 max-w-2xl text-xs leading-5 text-[#5e7067]">{outcome.detail}</p></div><div className="flex items-start sm:justify-end">{evidence.evidenceFileUrl ? <a href={evidence.evidenceFileUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-[#dce7de] px-3 py-2 text-xs font-semibold text-[#0f5c4f] hover:bg-[#f5fbf5]">View document</a> : <span className="text-xs text-[#87918b]">No document</span>}</div></div>;
      })}</div> : <div className="px-5 py-5 text-sm text-[#758079]">You have not submitted any payment evidence from this portal yet.</div>}
    </section>
  </section>;
}

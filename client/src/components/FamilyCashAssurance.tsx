import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { FileUp, HandCoins, ShieldCheck } from "lucide-react";
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

export function FamilyCashAssurance({ schoolId, role, onDone }: { schoolId: number; role: "parent" | "student"; onDone: () => void }) {
  const utils = trpc.useUtils();
  const query = trpc.nsos.portal.cashAssurance.useQuery({ schoolId });
  const [caseId, setCaseId] = useState("");
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState<"manual_receipt" | "bank_reference" | "provider_event" | "other">("bank_reference");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const selectedCase = useMemo(() => query.data?.cases.find((item: any) => String(item.id) === caseId), [caseId, query.data]);
  const selectedInvoice = selectedCase?.invoices?.[0];
  const submit = trpc.nsos.portal.submitPaymentEvidence.useMutation({
    onSuccess: async () => {
      toast.success("Payment evidence was sent to the school finance team for review. Your balance has not been changed automatically.");
      setAmount(""); setReference(""); setNote(""); setFile(null);
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
    setFile(selected);
  };
  const submitEvidence = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedCase || !selectedInvoice) return toast.error("Select the payment case you are responding to.");
    if (!file) return toast.error("Attach your receipt, transfer confirmation, or payment document.");
    try {
      const base64 = await fileToBase64(file);
      if (!base64) throw new Error("The selected document could not be read.");
      submit.mutate({ schoolId, caseId: selectedCase.id, invoiceId: selectedInvoice.id, amountClaimed: Number(amount), source, providerReference: reference || undefined, note: note || undefined, upload: { base64, fileName: file.name, mimeType: file.type as "image/jpeg" | "image/png" | "image/webp" | "application/pdf" } });
    } catch (error) { toast.error(error instanceof Error ? error.message : "The payment document could not be prepared."); }
  };

  if (query.isLoading) return <section className="rounded-2xl border border-[#e1e8e1] bg-white p-5 text-sm text-[#758079]">Loading payment promises and evidence…</section>;
  if (query.error) return <section className="rounded-2xl border border-[#f0c9c3] bg-[#fff5f3] p-5 text-sm text-[#914939]">Payment support could not be loaded: {query.error.message}</section>;

  return <section className="grid gap-5" aria-label="Payment promises and evidence">
    <div className="rounded-2xl border border-[#cce2d0] bg-[#f5fbf5] p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0f5c4f] text-white"><HandCoins className="h-4 w-4" /></span><div><p className="text-sm font-semibold text-[#1c4033]">Payment promises & evidence</p><p className="mt-1 max-w-2xl text-xs leading-5 text-[#587267]">View payment commitments for {role === "parent" ? "your linked learners" : "your school account"} and send proof of payment directly to the finance team.</p></div></div><Badge tone="good">Finance reviewed</Badge></div><p className="mt-4 flex items-center gap-2 text-[11px] text-[#567466]"><ShieldCheck className="h-3.5 w-3.5" />Submitting evidence does not record a payment or change your balance. The school must review it first.</p></div>

    <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]"><div className="overflow-hidden rounded-2xl border border-[#e1e8e1] bg-white"><div className="border-b border-[#edf0eb] px-5 py-4"><p className="text-sm font-semibold text-[#294239]">Your payment cases</p><p className="mt-1 text-xs text-[#758079]">Only cases linked to your own learner record are shown here.</p></div>{query.data?.cases?.length ? <div>{query.data.cases.map((item: any) => <div key={item.id} className="border-b border-[#edf0eb] px-5 py-4 last:border-0"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-[#30473b]">{item.student ? `${item.student.firstName} ${item.student.lastName}` : "Linked learner"}</p><Badge tone={item.status === "disputed" ? "warn" : item.status === "settled" ? "good" : "neutral"}>{String(item.status).replaceAll("_", " ")}</Badge></div><p className="mono mt-1 text-[10px] text-[#7a847e]">{item.invoices.map((invoice: any) => invoice.invoiceNo).join(", ")}</p>{item.pausedReason && <p className="mt-2 text-xs text-[#a26b1e]">Finance follow-up is paused while a school dispute is reviewed.</p>}</div><p className="text-sm font-bold text-[#0f5c4f]">{currency(item.outstanding)}</p></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{item.promises?.length ? <div className="rounded-lg bg-[#fafcf9] p-3"><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#758079]">Latest payment promise</p>{item.promises.slice(0, 1).map((promise: any) => <p key={promise.id} className="mt-1 text-xs font-semibold text-[#40584d]">{currency(promise.promisedAmount)} by {new Date(promise.promisedOn).toLocaleDateString()}</p>)}</div> : <div className="rounded-lg bg-[#fafcf9] p-3 text-xs text-[#758079]">No payment promise has been recorded.</div>}<div className="rounded-lg bg-[#fafcf9] p-3"><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#758079]">Evidence status</p>{item.evidence?.length ? <div className="mt-1 flex flex-wrap gap-1">{item.evidence.slice(0, 3).map((evidence: any) => <Badge key={evidence.id} tone={evidence.status === "accepted" ? "good" : evidence.status === "rejected" ? "danger" : "warn"}>{evidence.status.replaceAll("_", " ")}</Badge>)}</div> : <p className="mt-1 text-xs text-[#758079]">No evidence submitted.</p>}</div></div></div>)}</div> : <div className="p-5 text-sm text-[#758079]">There are no payment promises or evidence requests linked to this portal account.</div>}</div>

      <div className="rounded-2xl border border-[#e1e8e1] bg-white p-5"><div className="flex items-start gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#edf3ed] text-[#0f5c4f]"><FileUp className="h-4 w-4" /></span><div><p className="text-sm font-semibold text-[#294239]">Upload payment evidence</p><p className="mt-1 text-xs leading-5 text-[#758079]">Attach a receipt, bank-transfer confirmation, or provider document. Accepted types: JPG, PNG, WEBP, or PDF, up to 5 MB.</p></div></div><form onSubmit={submitEvidence} className="mt-5 grid gap-3"><label className="grid gap-1.5"><span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#68776f]">Payment case</span><select required className={inputClass} value={caseId} onChange={event => setCaseId(event.target.value)}><option value="">Select payment case</option>{query.data?.cases?.filter((item: any) => item.status !== "settled" && item.status !== "closed" && item.status !== "disputed" && item.invoices?.length).map((item: any) => <option value={item.id} key={item.id}>#{item.id} · {item.student ? `${item.student.firstName} ${item.student.lastName}` : "Linked learner"} · {currency(item.outstanding)}</option>)}</select></label><div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1.5"><span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#68776f]">Amount paid</span><input required type="number" min="1" max={selectedCase?.outstanding ?? undefined} className={inputClass} value={amount} onChange={event => setAmount(event.target.value)} /></label><label className="grid gap-1.5"><span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#68776f]">Payment type</span><select className={inputClass} value={source} onChange={event => setSource(event.target.value as typeof source)}><option value="bank_reference">Bank transfer</option><option value="manual_receipt">Receipt</option><option value="provider_event">Payment provider</option><option value="other">Other</option></select></label></div><label className="grid gap-1.5"><span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#68776f]">Reference (optional)</span><input className={inputClass} value={reference} onChange={event => setReference(event.target.value)} placeholder="Transfer or payment reference" /></label><label className="grid gap-1.5"><span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#68776f]">Payment document</span><input required type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="block w-full text-xs text-[#68776f] file:mr-3 file:rounded-lg file:border-0 file:bg-[#edf3ed] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#0f5c4f]" onChange={chooseFile} /></label>{file && <p className="text-[11px] text-[#567466]">Selected: {file.name} · {(file.size / 1024).toFixed(0)} KB</p>}<label className="grid gap-1.5"><span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#68776f]">Note (optional)</span><textarea className="min-h-20 w-full rounded-lg border border-[#dfe5df] bg-white px-3 py-2 text-sm text-[#294239] outline-none focus:border-[#0f5c4f]" value={note} onChange={event => setNote(event.target.value)} placeholder="Optional context for the finance team" /></label><button disabled={submit.isPending || !selectedCase} className="rounded-xl bg-[#0f5c4f] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{submit.isPending ? "Sending to finance…" : "Send evidence for review"}</button></form></div></div>
  </section>;
}

import { CheckCircle2, Handshake, Loader2, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { trpc } from "@/lib/trpc";

const money = (value: number | string) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(Number(value));

export function AffiliatePilotConsole({ open, onClose }: { open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils();
  const overview = trpc.nsos.affiliatePilot.overview.useQuery(undefined, { enabled: open });
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const confirmDefaults = trpc.nsos.affiliatePilot.confirmInternalDefaults.useMutation({
    onSuccess: () => {
      toast.success("Internal affiliate pilot defaults recorded.");
      setConfirmationOpen(false);
      void utils.nsos.affiliatePilot.overview.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  if (!open) return null;
  const data = overview.data;
  const configuration = data?.configuration;
  return <div className="fixed inset-0 z-[81] overflow-y-auto bg-[#0a1713]/55 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-label="NSOS affiliate pilot">
    <div className="mx-auto max-w-5xl overflow-hidden rounded-[1.4rem] border border-[#dbe5dc] bg-[#f7f8f4] shadow-2xl">
      <header className="flex items-start justify-between gap-3 border-b border-[#dfe5df] bg-white px-5 py-5 sm:gap-5 sm:px-7"><div><div className="flex items-center gap-2 text-[#0f5c4f]"><Handshake className="h-4 w-4" /><p className="mono text-[10px] font-semibold uppercase tracking-[0.16em]">Platform owner · internal review</p></div><h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[#173128]">Affiliate pilot controls</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-[#68736d]">Record the approved pilot defaults for review. This workspace does not enrol creators, issue referral links, publish terms, send outreach, track real referrals, or pay commissions.</p></div><div className="flex shrink-0 items-center gap-2">{data && !data.defaultsRecorded && !overview.isLoading && <button type="button" onClick={() => setConfirmationOpen(true)} className="rounded-lg bg-[#0f5c4f] px-3 py-2 text-xs font-bold text-white shadow-sm transition active:scale-[.97]" aria-label="Record approved affiliate defaults">Record</button>}<button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg border border-[#dfe5df] text-[#51635a] hover:bg-[#f4f6f2]" aria-label="Close affiliate pilot"><X className="h-4 w-4" /></button></div></header>
      {overview.isLoading ? <div className="grid min-h-80 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-[#0f5c4f]" /></div> : overview.error || !configuration || !data ? <div className="p-8 text-sm text-[#a13e38]">{overview.error?.message ?? "Affiliate pilot controls are unavailable. Try again shortly."}</div> : <main className="grid gap-6 p-5 sm:p-7">
        <section className="rounded-2xl bg-[#123b31] p-5 text-white sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-white/55">Approved model</p><h3 className="mt-2 text-2xl font-semibold tracking-[-.04em]">20% of a first verified payment</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">The later commission review must use the independently verified platform billing record and a frozen calculation snapshot. It cannot change subscriptions, invoices, payments, or school data.</p></div><span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.1em] ${data.defaultsRecorded ? "bg-[#d9f0e0] text-[#176145]" : "bg-[#fff0c8] text-[#805615]"}`}>{data.defaultsRecorded ? <CheckCircle2 className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}{data.defaultsRecorded ? "Defaults recorded" : "Awaiting confirmation"}</span></div></section>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Attribution window" value={`${configuration.attributionWindowDays} days`} /><Metric label="Refund / chargeback hold" value={`${configuration.refundHoldDays} days`} /><Metric label="Minimum payout" value={money(configuration.minimumPayout)} /><Metric label="Payout review" value="Monthly · manual" /></section>
        <section className="grid gap-5 rounded-2xl border border-[#dfe5df] bg-white p-5 sm:grid-cols-[1fr_auto] sm:items-start"><div><p className="text-sm font-semibold text-[#243c31]">Internal configuration record</p><p className="mt-1 max-w-2xl text-xs leading-5 text-[#6d7a73]">Eligible plans are limited to standard paid NSOS subscriptions. Terms remain marked for legal review, and the pilot stays in internal review until a separate activation decision.</p><div className="mt-4 grid gap-2 text-xs text-[#4d6258]"><p><strong className="text-[#263e33]">Commission basis:</strong> 20% of Net First Payment</p><p><strong className="text-[#263e33]">Terms status:</strong> Legal review required</p><p><strong className="text-[#263e33]">Referral activation:</strong> Not available</p></div></div>{!data.defaultsRecorded && <button type="button" onClick={() => setConfirmationOpen(true)} className="inline-flex h-10 items-center justify-center rounded-xl bg-[#0f5c4f] px-4 text-xs font-bold text-white shadow-sm transition active:scale-[.97]">Record approved defaults</button>}</section>
        <section className="rounded-2xl border border-[#eadbb9] bg-[#fffaf0] p-5"><div className="flex gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[#8a5a12]"><ShieldCheck className="h-4 w-4" /></span><div><p className="text-sm font-semibold text-[#674714]">Activation remains blocked</p><ul className="mt-2 grid gap-1 text-xs leading-5 text-[#795e2d]">{data.activationBlockers.map(blocker => <li key={blocker}>• {blocker}</li>)}</ul></div></div></section>
      </main>}
    </div>
    <AlertDialog open={confirmationOpen} onOpenChange={setConfirmationOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Record approved affiliate pilot defaults?</AlertDialogTitle><AlertDialogDescription>This records the 30-day attribution window, 30-day refund/chargeback hold, ₦10,000 minimum payout, monthly manual review, standard paid plan eligibility, and 20% first-payment basis. It does not enrol an affiliate, issue a link, publish a term, create a referral, contact anyone, or approve a payout.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={confirmDefaults.isPending}>Cancel</AlertDialogCancel><AlertDialogAction disabled={confirmDefaults.isPending} onClick={event => { event.preventDefault(); confirmDefaults.mutate({ confirmed: true }); }}>{confirmDefaults.isPending ? "Recording…" : "Record internal defaults"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-[#dfe5df] bg-white p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7b8780]">{label}</p><p className="mt-2 text-lg font-semibold tracking-[-0.04em] text-[#173128]">{value}</p></div>; }

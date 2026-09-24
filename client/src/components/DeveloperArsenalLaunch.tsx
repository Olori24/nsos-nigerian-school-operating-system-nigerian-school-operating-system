import { useEffect, useState } from "react";
import { Activity, ArrowRight, CheckCircle2, ShieldCheck, Sparkles, Zap } from "lucide-react";

type ArsenalItem = { label: string; detail: string; icon: typeof ShieldCheck };

const items: ArsenalItem[] = [
  { label: "Security gates", detail: "CodeQL · secrets · dependency review", icon: ShieldCheck },
  { label: "Testing confidence", detail: "Unit · critical flows · regression", icon: CheckCircle2 },
  { label: "Observability", detail: "Health · failures · operational signals", icon: Activity },
  { label: "Automation", detail: "Idempotent · approval-first · replay-safe", icon: Zap },
  { label: "AI engineering", detail: "Supervised AI with deterministic controls", icon: Sparkles },
  { label: "Provider independence", detail: "Payments · messaging · storage behind adapters", icon: ArrowRight },
];

export function DeveloperArsenalLaunch() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const seen = window.sessionStorage.getItem("nsos:arsenal-launch-seen");
    if (!seen) setOpen(true);
  }, []);

  const dismiss = () => {
    window.sessionStorage.setItem("nsos:arsenal-launch-seen", "1");
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#071b16]/80 p-4 backdrop-blur-md sm:p-6">
      <div className="mx-auto flex min-h-full max-w-3xl items-center justify-center py-8">
        <section className="w-full overflow-hidden rounded-[2rem] border border-white/15 bg-[#0c2f27] text-white shadow-2xl">
          <div className="relative p-6 sm:p-8">
            <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[#66e3b0]/20 blur-3xl" />
            <div className="relative">
              <div className="mb-5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.18em] text-[#8ff0c8]">
                <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-[#8ff0c8]" /> Developer Arsenal · Live in NSOS
              </div>
              <h1 className="max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">NSOS is no longer just a school app.</h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">The engineering system behind it is now being turned into a faster, safer delivery engine — so new capabilities can reach schools without rebuilding the world every time.</p>

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {items.map(({ label, detail, icon: Icon }) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-white/[.06] p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-white/10 p-2"><Icon className="h-4 w-4 text-[#8ff0c8]" /></div>
                      <div className="min-w-0"><p className="text-sm font-semibold">{label}</p><p className="mt-1 text-xs leading-5 text-white/55">{detail}</p></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-7 flex flex-col gap-3 rounded-2xl border border-[#8ff0c8]/20 bg-[#8ff0c8]/[.07] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div><p className="text-sm font-semibold">What you should notice next</p><p className="mt-1 text-xs text-white/55">Faster workflows, stronger mobile UX, clearer health signals and more automation — inside the real product.</p></div>
                <button onClick={dismiss} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#8ff0c8] px-5 py-3 text-sm font-bold text-[#073126] transition hover:brightness-105">Open NSOS <ArrowRight className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

import { FormEvent, useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, Mail, School } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function LeadCapture() {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [consent, setConsent] = useState(false);
  const capture = trpc.nsos.leads.capture.useMutation({
    onSuccess: () => {
      toast.success("You're on the NSOS list.");
      setFirstName("");
      setEmail("");
      setSchoolName("");
      setConsent(false);
    },
    onError: error => toast.error(error.message),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    capture.mutate({ firstName, email, schoolName: schoolName || undefined, consent: true, leadSource: "nsos.top/start" });
  };

  return (
    <main className="min-h-screen bg-[#0b1715] px-5 py-8 text-white sm:px-8 lg:px-12">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col overflow-hidden rounded-[1.8rem] border border-white/10 bg-[radial-gradient(circle_at_76%_18%,rgba(47,113,92,0.4),transparent_28%),linear-gradient(115deg,#10251f_0%,#0b1715_62%,#123328_100%)] shadow-2xl">
        <header className="flex items-center justify-between px-6 py-6 sm:px-9">
          <a href="/" className="flex items-center gap-3" aria-label="NSOS home">
            <img src="/icons/nsos-icon-192.png" alt="NSOS" className="h-9 w-9 rounded-xl" />
            <span><strong className="block text-sm">NSOS</strong><span className="text-[9px] font-semibold uppercase tracking-[.15em] text-white/45">Nigerian School OS</span></span>
          </a>
          <a href="/" className="text-xs font-semibold text-white/55 hover:text-white">Sign in</a>
        </header>

        <div className="grid flex-1 items-center gap-12 px-6 py-12 sm:px-9 lg:grid-cols-[1.05fr_.75fr] lg:px-16">
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#a6d7b5]">NSOS early access</p>
            <h1 className="mt-5 max-w-3xl text-5xl font-semibold leading-[.95] tracking-[-.055em] sm:text-7xl">Run the school from one calm center.</h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/65">See how NSOS brings admissions, academics, attendance, results, fees, staff and family communication into one operating environment.</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {["One school operating environment", "Nigeria-first workflows", "AI-assisted setup and operations", "Human approval stays in control"].map(item => (
                <div key={item} className="flex items-center gap-2 text-xs text-white/65"><CheckCircle2 className="h-4 w-4 text-[#a6d7b5]" />{item}</div>
              ))}
            </div>
          </section>

          <section className="rounded-[1.4rem] border border-white/12 bg-white/[.07] p-6 shadow-2xl backdrop-blur-sm sm:p-7">
            <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#dcefe1] text-[#123b31]"><School className="h-5 w-5" /></span><div><p className="text-sm font-semibold">Get the NSOS walkthrough</p><p className="mt-1 text-xs text-white/45">Leave your details and we'll keep you updated.</p></div></div>
            <form onSubmit={submit} className="mt-6 grid gap-3">
              <label className="grid gap-1.5 text-xs font-semibold text-white/75"><span>First name</span><input required maxLength={80} value={firstName} onChange={e => setFirstName(e.target.value)} className="h-11 rounded-xl border border-white/12 bg-white/[.08] px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#b8e3c1]" placeholder="Your first name" /></label>
              <label className="grid gap-1.5 text-xs font-semibold text-white/75"><span>Email</span><input required type="email" maxLength={320} autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="h-11 rounded-xl border border-white/12 bg-white/[.08] px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#b8e3c1]" placeholder="you@school.edu.ng" /></label>
              <label className="grid gap-1.5 text-xs font-semibold text-white/75"><span>School or organisation <span className="font-normal text-white/35">(optional)</span></span><input maxLength={180} value={schoolName} onChange={e => setSchoolName(e.target.value)} className="h-11 rounded-xl border border-white/12 bg-white/[.08] px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#b8e3c1]" placeholder="Your school or organisation" /></label>
              <label className="flex items-start gap-2 pt-1 text-[11px] leading-5 text-white/55"><input required type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-1 h-4 w-4 accent-[#a6d7b5]" /><span>I agree to receive NSOS product updates and follow-up emails. I can unsubscribe at any time.</span></label>
              <button disabled={capture.isPending || !consent} className="mt-2 flex h-12 items-center justify-center gap-2 rounded-xl bg-[#dcefe1] px-4 text-sm font-bold text-[#123b31] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60">{capture.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}{capture.isPending ? "Joining…" : "Get the NSOS walkthrough"}<ArrowRight className="h-4 w-4" /></button>
            </form>
            <p className="mt-4 text-[10px] leading-4 text-white/30">Your details are used for NSOS communications. No password is created by this form.</p>
          </section>
        </div>
      </div>
    </main>
  );
}

import { trpc } from "@/lib/trpc";
import { Bot, Loader2, PlayCircle, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type PlanActionId = "academic_foundation" | "team" | "learners" | "finance" | "public_presence" | "manual";

const actionNames: Record<PlanActionId, string> = { academic_foundation: "Academic foundation", team: "First team member", learners: "Learner records", finance: "Finance draft", public_presence: "School website", manual: "A guided review" };

export function AiSetupPlanner({ schoolId, onStart, onNavigate }: { schoolId: number; onStart: (action: "academic_foundation" | "team" | "finance") => void; onNavigate: (destination: string) => void }) {
  const [request, setRequest] = useState("");
  const [plan, setPlan] = useState<{ reply: string; recommendedActionId: PlanActionId; nextQuestions: string[]; source: "ai" | "guided"; requiresConfirmation: true } | null>(null);
  const generate = trpc.nsos.setupAgent.plan.useMutation({ onSuccess: result => setPlan(result as typeof plan), onError: error => toast.error(error.message) });
  const start = () => {
    if (!plan) return;
    if (plan.recommendedActionId === "academic_foundation" || plan.recommendedActionId === "team" || plan.recommendedActionId === "finance") return onStart(plan.recommendedActionId);
    if (plan.recommendedActionId === "learners") return onNavigate("students");
    if (plan.recommendedActionId === "public_presence") return onNavigate("website");
  };
  const canOpenTask = plan && plan.recommendedActionId !== "manual";
  return <section className="rounded-xl border border-[#bedcc7] bg-[linear-gradient(120deg,#effaf2_0%,#f8fcfb_55%,#edf7f3_100%)] p-4"><div className="flex gap-2.5"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#0f5c4f] text-white"><Bot className="h-4 w-4" /></span><div><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-bold text-[#29483b]">NSOS AI onboarding agent</p><span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-[.08em] text-[#176145]">Supervised</span></div><p className="mt-0.5 text-[11px] leading-4 text-[#64756b]">Describe what you want to achieve. The agent reads only the school’s readiness signals, proposes a supported next step, and opens the right approval-gated workflow. It never acts by itself.</p></div></div><div className="mt-3 flex gap-2"><input value={request} onChange={event => setRequest(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && request.trim().length >= 2) generate.mutate({ schoolId, request: request.trim() }); }} maxLength={600} placeholder="e.g. Help me set up our new term and classes" className="h-10 min-w-0 flex-1 rounded-lg border border-[#c9ddce] bg-white px-3 text-xs text-[#263a2f] outline-none focus:border-[#0f5c4f] focus:ring-2 focus:ring-[#0f5c4f]/10" /><button type="button" disabled={request.trim().length < 2 || generate.isPending} onClick={() => generate.mutate({ schoolId, request: request.trim() })} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#0f5c4f] px-3 text-xs font-bold text-white disabled:opacity-50">{generate.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}{generate.isPending ? "Planning…" : "Make a plan"}</button></div>{plan && <div className="mt-3 rounded-lg border border-[#d5e7d9] bg-white p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[11px] font-bold text-[#2d4b3b]">{actionNames[plan.recommendedActionId]}</p><span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#28704c]"><ShieldCheck className="h-3.5 w-3.5" />Confirmation stays with you</span></div><p className="mt-1 text-[11px] leading-5 text-[#586b61]">{plan.reply}</p><div className="mt-2 grid gap-1">{plan.nextQuestions.map(question => <p key={question} className="text-[10px] leading-4 text-[#67786f]">• {question}</p>)}</div>{canOpenTask && <button type="button" onClick={start} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[#a9cfb3] bg-[#f5fbf6] px-3 py-2 text-[11px] font-bold text-[#176145]"><PlayCircle className="h-3.5 w-3.5" />Open the approved workflow</button>}</div>}</section>;
}

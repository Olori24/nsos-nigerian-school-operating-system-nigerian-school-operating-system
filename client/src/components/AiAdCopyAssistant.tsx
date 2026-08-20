import { trpc } from "@/lib/trpc";
import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export type AiAdCopyAudience = {
  objective: "lead_generation" | "website_visits" | "awareness";
  locations: string;
  ageMin: string;
  ageMax: string;
  note: string;
};

export type AiAdCopySuggestion = { primaryText: string; headline: string; callToAction: "learn_more" | "apply_now" | "contact_us"; reviewNote: string };

export function AiAdCopyAssistant({ schoolId, audience, onUse }: { schoolId: number; audience: AiAdCopyAudience; onUse: (suggestion: AiAdCopySuggestion) => void }) {
  const [guidance, setGuidance] = useState("");
  const [suggestions, setSuggestions] = useState<AiAdCopySuggestion[]>([]);
  const locations = audience.locations.split(",").map(value => value.trim()).filter(Boolean);
  const generate = trpc.nsos.advertising.generateCopy.useMutation({ onSuccess: result => { setSuggestions(result.suggestions); toast.success("Three AI copy drafts are ready for your review."); }, onError: error => toast.error(error.message) });
  const disabled = !locations.length || generate.isPending;

  return <section className="mx-5 mb-5 rounded-xl border border-[#cfdfd4] bg-[#f5faf6] p-4 sm:mx-6 sm:mb-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="flex gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[#176145] shadow-sm"><Sparkles className="h-4 w-4" /></span><div><p className="text-sm font-semibold text-[#29483b]">AI copy assistant</p><p className="mt-1 max-w-2xl text-xs leading-5 text-[#68776f]">Generate three editable suggestions from the current objective and audience fields. Suggestions never save, publish, change budgets, or activate an advert until you choose to use and then save them.</p></div></div></div><label className="mt-4 grid gap-1.5 text-xs font-semibold text-[#43534c]"><span>Optional school-approved guidance</span><input value={guidance} onChange={event => setGuidance(event.target.value)} maxLength={600} className="h-10 w-full rounded-lg border border-[#d8e4da] bg-white px-3 text-sm text-[#15201c] outline-none transition focus:border-[#0f5c4f] focus:ring-2 focus:ring-[#0f5c4f]/10" placeholder="For example, focus on a welcoming admissions enquiry invitation." /></label><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className="text-[11px] leading-5 text-[#758079]">Add at least one audience location above to generate copy. Review every claim before use.</p><button type="button" disabled={disabled} onClick={() => generate.mutate({ schoolId, objective: audience.objective, audienceSummary: { locations, ageMin: audience.ageMin ? Number(audience.ageMin) : undefined, ageMax: audience.ageMax ? Number(audience.ageMax) : undefined, note: audience.note || undefined }, guidance: guidance || undefined })} className="inline-flex items-center gap-2 rounded-lg bg-[#176145] px-3.5 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{generate.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}{generate.isPending ? "Generating…" : "Generate copy"}</button></div>{suggestions.length > 0 && <div className="mt-4 grid gap-3 lg:grid-cols-3">{suggestions.map((suggestion, index) => <article key={`${suggestion.headline}-${index}`} className="flex flex-col rounded-lg border border-[#dce9df] bg-white p-3"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#527262]">Suggestion {index + 1}</p><p className="mt-2 text-sm font-semibold text-[#2f443a]">{suggestion.headline}</p><p className="mt-2 flex-1 text-xs leading-5 text-[#65746c]">{suggestion.primaryText}</p><p className="mt-3 text-[11px] leading-4 text-[#8a6a2c]">Review: {suggestion.reviewNote}</p><button type="button" onClick={() => { onUse(suggestion); toast.success("Copy suggestion applied to the editor. Review and save it when ready."); }} className="mt-3 rounded-lg border border-[#b9d3c0] bg-[#f8fcf8] px-3 py-2 text-xs font-bold text-[#176145]">Use this suggestion</button></article>)}</div>}</section>;
}

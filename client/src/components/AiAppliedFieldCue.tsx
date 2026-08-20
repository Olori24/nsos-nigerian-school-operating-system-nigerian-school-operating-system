import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function AiAppliedFieldCue({ applied }: { applied?: boolean }) {
  if (!applied) return null;
  return <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#fff0b8] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[.08em] text-[#735000] dark:bg-[#624b05] dark:text-[#ffe59a]"><Sparkles className="h-2.5 w-2.5" />AI added — review</span>;
}

export function aiAppliedFieldClass(applied?: boolean) {
  return cn(applied && "rounded-xl border border-[#e3b550] bg-[#fffbee] p-2 shadow-[0_0_0_3px_rgba(227,181,80,0.12)] dark:border-[#bc9638] dark:bg-[#3a321c]");
}

export function suggestedFieldKeys(values: Record<string, unknown>) {
  return new Set(Object.keys(values).filter(key => typeof values[key] === "string" && values[key].trim().length > 0));
}

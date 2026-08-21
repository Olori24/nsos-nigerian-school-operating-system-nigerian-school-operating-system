import { AIChatBox, type Message } from "@/components/AIChatBox";
import { CopilotSetupAgent } from "@/components/CopilotSetupAgent";
import { CopilotVoiceInput } from "@/components/CopilotVoiceInput";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getRecentSearchShortcut, isCopilotOpenShortcut } from "@/lib/copilotShortcuts";
import { trpc } from "@/lib/trpc";
import { Bot, Compass, History, Keyboard, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type CopilotGuidance = { reply: string; destination: string | null; suggestions: string[]; source: "ai" | "guided"; destinations: Array<{ id: string; label: string; description: string }> };

const promptsByRole: Record<string, string[]> = {
  owner: ["Where can I review admissions?", "How do I update our school website?", "Show me finance reporting."],
  admin: ["Where can I review admissions?", "How do I update our school website?", "Show me attendance."],
  staff: ["Where can I review admissions?", "How do I manage student records?", "Show me staff duties."],
  teacher: ["Where do I record attendance?", "Where do I enter results?", "How do I find my classes?"],
  finance: ["Where do I review invoices?", "How do I find payments?", "Show me finance reporting."],
  parent: ["Where can I see my child’s results?", "Where do I view fees?", "Show me school announcements."],
  student: ["Where can I see my results?", "Where do I check fees?", "Show me school announcements."],
};

function isEditableTarget(target: EventTarget | null) {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || (target instanceof HTMLElement && target.isContentEditable);
}

export function NsosCopilot({ schoolId, role, onNavigate }: { schoolId: number; role: string; onNavigate: (view: string) => void }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [guidance, setGuidance] = useState<CopilotGuidance | null>(null);
  const [activeRecentIndex, setActiveRecentIndex] = useState(0);
  const prompts = useMemo(() => promptsByRole[role] ?? ["Where should I start?", "Show my available workspaces.", "How do I manage my account security?"], [role]);
  const recent = trpc.nsos.copilot.recent.useQuery({ schoolId, limit: 6 }, { enabled: open });
  const history = recent.data ?? [];
  const clearRecent = trpc.nsos.copilot.clearRecent.useMutation({ onSuccess: result => { void recent.refetch(); toast.success(result.deletedCount ? "Recent searches cleared." : "There were no saved searches to clear."); }, onError: error => toast.error(error.message) });
  const ask = trpc.nsos.copilot.ask.useMutation({
    onSuccess: result => {
      const answer = result as CopilotGuidance;
      setGuidance(answer);
      setMessages(current => [...current, { role: "assistant", content: answer.reply }]);
      void recent.refetch();
    },
    onError: error => {
      setMessages(current => [...current, { role: "assistant", content: "I could not prepare a navigation suggestion just now. You can still use the menu to reach your permitted workspaces." }]);
      toast.error(error.message);
    },
  });
  const send = (message: string) => {
    setGuidance(null);
    setMessages(current => [...current, { role: "user", content: message }]);
    ask.mutate({ schoolId, message });
  };
  const destination = guidance?.destination ? guidance.destinations.find(item => item.id === guidance.destination) : null;
  const goToDestination = () => {
    if (!destination) return;
    onNavigate(destination.id);
    setOpen(false);
    toast.success(`Opening ${destination.label}.`);
  };
  const showRecent = messages.length === 0 && !ask.isPending && (recent.isLoading || history.length > 0);

  useEffect(() => { if (open) setActiveRecentIndex(0); }, [open]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isCopilotOpenShortcut(event)) { event.preventDefault(); setOpen(true); return; }
      if (!open) return;
      if (event.key === "Escape") { setOpen(false); return; }
      const action = getRecentSearchShortcut(event, { isEditable: isEditableTarget(event.target), recentCount: messages.length === 0 ? history.length : 0, activeIndex: activeRecentIndex });
      if (action.type === "none") return;
      event.preventDefault();
      if (action.type === "select") setActiveRecentIndex(action.index);
      if (action.type === "repeat") send(history[action.index]!.query);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeRecentIndex, history, messages.length, open]);

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><button type="button" className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#c0d9c8] bg-[#eff8f0] px-3 text-xs font-bold text-[#176145] shadow-sm transition hover:border-[#8eb9a0] hover:bg-[#e3f3e6] active:scale-[0.97]" aria-label="Open NSOS Copilot" aria-keyshortcuts="Control+K Meta+K" title="Open Copilot (Ctrl/⌘ K)"><Sparkles className="h-4 w-4" /><span className="hidden sm:inline">Copilot</span><kbd className="hidden rounded border border-[#b8d4c0] bg-white/80 px-1 py-0.5 font-mono text-[9px] text-[#39755d] lg:inline">⌘K</kbd></button></DialogTrigger>
    <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto border-[#d8e5db] bg-[#f9fcf8] p-0 sm:rounded-[1.3rem]">
      <DialogHeader className="border-b border-[#dce8df] bg-[#eff7f0] px-5 py-5 text-left"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0f5c4f] text-white shadow-sm"><Bot className="h-5 w-5" /></span><div><DialogTitle className="text-base text-[#19372c]">NSOS Copilot</DialogTitle><DialogDescription className="mt-1 text-xs leading-5 text-[#607169]">Navigate authorised workspaces or, for owners and administrators, launch a supervised setup agent that acts only on school-approved details.</DialogDescription></div></div></DialogHeader>
      {showRecent && <section className="border-b border-[#dce8df] bg-white px-5 py-3"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-xs font-bold text-[#375047]"><History className="h-3.5 w-3.5 text-[#39755d]" />Recent searches</div>{history.length > 0 && <button type="button" disabled={clearRecent.isPending} onClick={() => clearRecent.mutate({ schoolId })} className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#8c4c3d] hover:text-[#6f372c] disabled:opacity-60"><Trash2 className="h-3 w-3" />Clear</button>}</div>{recent.isLoading ? <div className="mt-2 h-8 animate-pulse rounded-lg bg-[#f0f4f0]" /> : <div className="mt-2 flex flex-wrap gap-2">{history.map((item, index) => <button key={item.id} type="button" onClick={() => send(item.query)} className={`max-w-full truncate rounded-lg border px-2.5 py-1.5 text-left text-[11px] font-medium transition active:scale-[0.97] ${activeRecentIndex === index ? "border-[#448967] bg-[#e9f6eb] text-[#1b6043] ring-2 ring-[#b9dfc4]" : "border-[#d9e5dc] bg-[#f9fcf9] text-[#406156] hover:border-[#add0b8] hover:bg-[#eff8f0]"}`} title={`Repeat: ${item.query}`}>{item.query}</button>)}</div>}<p className="mt-2 flex items-center gap-1.5 text-[10px] leading-4 text-[#7a867f]"><Keyboard className="h-3 w-3 shrink-0" />Use ↑/↓ to select and Enter to repeat. Search shortcuts pause while you are typing.</p></section>}
      <div className="relative"><AIChatBox messages={messages} onSendMessage={send} isLoading={ask.isPending} height="360px" placeholder="For example: Where do I record attendance?" emptyStateMessage="Tell me what you want to do and I will point you to the right workspace." suggestedPrompts={prompts} inputAccessory={input => <CopilotVoiceInput value={input.value} onValueChange={input.onValueChange} onAutoSubmit={send} disabled={input.disabled} />} className="rounded-none border-0 bg-transparent shadow-none" />{destination && <div className="absolute bottom-[78px] left-4 right-4 rounded-xl border border-[#bcd8c4] bg-[#f2faf3] p-3 shadow-lg"><div className="flex items-start gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-[#176145]"><Compass className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="text-xs font-bold text-[#244536]">{destination.label}</p><p className="mt-0.5 text-[11px] leading-4 text-[#64756b]">{destination.description}</p></div><button type="button" onClick={goToDestination} className="shrink-0 rounded-lg bg-[#0f5c4f] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#0b4b40] active:scale-[0.97]">Take me there</button></div></div>}</div>
      <CopilotSetupAgent schoolId={schoolId} role={role} onNavigate={view => { onNavigate(view); setOpen(false); }} />
      <div className="flex items-center gap-2 border-t border-[#dce8df] bg-white px-5 py-3 text-[10px] leading-4 text-[#718078]"><ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#3d8160]" />Voice requests send automatically after speech ends. Setup actions require owner or administrator approval and use only confirmed school details; browser voice handling is used and NSOS does not store audio recordings.</div>
    </DialogContent>
  </Dialog>;
}

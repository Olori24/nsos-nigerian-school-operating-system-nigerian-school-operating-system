import { AIChatBox, type Message } from "@/components/AIChatBox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Bot, Compass, ShieldCheck, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type CopilotGuidance = {
  reply: string;
  destination: string | null;
  suggestions: string[];
  source: "ai" | "guided";
  destinations: Array<{ id: string; label: string; description: string }>;
};

const promptsByRole: Record<string, string[]> = {
  owner: ["Where can I review admissions?", "How do I update our school website?", "Show me finance reporting."],
  admin: ["Where can I review admissions?", "How do I update our school website?", "Show me attendance."],
  staff: ["Where can I review admissions?", "How do I manage student records?", "Show me staff duties."],
  teacher: ["Where do I record attendance?", "Where do I enter results?", "How do I find my classes?"],
  finance: ["Where do I review invoices?", "How do I find payments?", "Show me finance reporting."],
  parent: ["Where can I see my child’s results?", "Where do I view fees?", "Show me school announcements."],
  student: ["Where can I see my results?", "Where do I check fees?", "Show me school announcements."],
};

export function NsosCopilot({ schoolId, role, onNavigate }: { schoolId: number; role: string; onNavigate: (view: string) => void }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [guidance, setGuidance] = useState<CopilotGuidance | null>(null);
  const prompts = useMemo(() => promptsByRole[role] ?? ["Where should I start?", "Show my available workspaces.", "How do I manage my account security?"], [role]);
  const ask = trpc.nsos.copilot.ask.useMutation({
    onSuccess: result => {
      const answer = result as CopilotGuidance;
      setGuidance(answer);
      setMessages(current => [...current, { role: "assistant", content: answer.reply }]);
    },
    onError: error => {
      setMessages(current => [...current, { role: "assistant", content: "I could not prepare a navigation suggestion just now. You can still use the menu on the left to reach your permitted workspaces." }]);
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

  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><button type="button" className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#c0d9c8] bg-[#eff8f0] px-3 text-xs font-bold text-[#176145] shadow-sm transition hover:border-[#8eb9a0] hover:bg-[#e3f3e6] active:scale-[0.97]" aria-label="Open NSOS Copilot"><Sparkles className="h-4 w-4" /><span className="hidden sm:inline">Copilot</span></button></DialogTrigger><DialogContent className="max-w-xl overflow-hidden border-[#d8e5db] bg-[#f9fcf8] p-0 sm:rounded-[1.3rem]"><DialogHeader className="border-b border-[#dce8df] bg-[#eff7f0] px-5 py-5 text-left"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0f5c4f] text-white shadow-sm"><Bot className="h-5 w-5" /></span><div><DialogTitle className="text-base text-[#19372c]">NSOS Copilot</DialogTitle><DialogDescription className="mt-1 text-xs leading-5 text-[#607169]">Ask where to go next. Copilot only suggests workspaces available to your {role} role and never changes records or permissions.</DialogDescription></div></div></DialogHeader><div className="relative"><AIChatBox messages={messages} onSendMessage={send} isLoading={ask.isPending} height="430px" placeholder="For example: Where do I record attendance?" emptyStateMessage="Tell me what you want to do and I will point you to the right workspace." suggestedPrompts={prompts} className="rounded-none border-0 bg-transparent shadow-none" />{destination && <div className="absolute bottom-[78px] left-4 right-4 rounded-xl border border-[#bcd8c4] bg-[#f2faf3] p-3 shadow-lg"><div className="flex items-start gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-[#176145]"><Compass className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="text-xs font-bold text-[#244536]">{destination.label}</p><p className="mt-0.5 text-[11px] leading-4 text-[#64756b]">{destination.description}</p></div><button type="button" onClick={goToDestination} className="shrink-0 rounded-lg bg-[#0f5c4f] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#0b4b40] active:scale-[0.97]">Take me there</button></div></div>}</div><div className="flex items-center gap-2 border-t border-[#dce8df] bg-white px-5 py-3 text-[10px] leading-4 text-[#718078]"><ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#3d8160]" />Copilot receives your navigation question and permitted destination labels only. It does not receive school records, family information, credentials, or session data.</div></DialogContent></Dialog>;
}

import { trpc } from "@/lib/trpc";
import { AlertTriangle, BookOpenCheck, Loader2, MessageCircleQuestion, ShieldCheck, UserRoundCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

export function StudentAiTutorHub({ schoolId }: { schoolId: number }) {
  const hub = trpc.nsos.aiTutors.studentHub.useQuery({ schoolId });
  const [tutorId, setTutorId] = useState("");
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<{ answer: string; studySteps: string[]; needsTeacherSupport: boolean; tutorName: string } | null>(null);
  const ask = trpc.nsos.aiTutors.ask.useMutation({
    onSuccess: result => {
      setResponse(result);
      if (result.needsTeacherSupport) toast.message("This question needs a supervising teacher’s help.");
    },
    onError: error => toast.error(error.message),
  });
  const support = trpc.nsos.aiTutors.requestTeacherSupport.useMutation({
    onSuccess: result => toast.success(result.message),
    onError: error => toast.error(error.message),
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (tutorId) ask.mutate({ schoolId, tutorId: Number(tutorId), question });
  };

  if (hub.isLoading) return <div className="grid min-h-[320px] place-items-center rounded-[1.2rem] border border-[#e0e5df] bg-white"><Loader2 className="h-5 w-5 animate-spin text-[#0f5c4f]" /></div>;
  if (hub.error || !hub.data) return <div className="rounded-[1.2rem] border border-[#ead1ce] bg-[#fff8f7] p-6"><p className="text-sm font-semibold text-[#903b34]">Study tutor unavailable</p><p className="mt-1 text-xs leading-5 text-[#75524e]">{hub.error?.message ?? "Try again shortly."}</p></div>;
  const selected = hub.data.tutors.find(tutor => tutor.id === Number(tutorId));

  return (
    <div className="grid gap-6">
      <section className="rounded-[1.2rem] bg-[#123b31] p-6 text-white sm:p-7">
        <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-white/50">Supervised study support</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-.045em]">Ask for help with a school subject.</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/65">This is AI study support, not your teacher. It can explain approved topics and suggest practice steps. If something needs human judgment or feels unsafe, ask a trusted adult or use the teacher-support action below.</p>
      </section>

      {!hub.data.studentLinked ? (
        <section className="rounded-[1.2rem] border border-[#ead1ce] bg-[#fff8f7] p-6"><p className="text-sm font-semibold text-[#903b34]">Student profile not linked</p><p className="mt-1 text-xs leading-5 text-[#75524e]">Ask the school office to link your student profile to this account before using AI study support.</p></section>
      ) : !hub.data.tutors.length ? (
        <section className="rounded-[1.2rem] border border-[#e0e5df] bg-white p-7 text-center"><BookOpenCheck className="mx-auto h-5 w-5 text-[#9aa7a0]" /><p className="mt-3 text-sm font-semibold text-[#44564d]">No tutor is available for your current level</p><p className="mx-auto mt-1 max-w-md text-xs leading-5 text-[#758079]">Your school can activate approved subject tutors with a named supervising adult.</p></section>
      ) : (
        <>
          <section className="rounded-[1.2rem] border border-[#e0e5df] bg-white p-5 shadow-[0_10px_32px_rgba(16,45,35,.035)] sm:p-6">
            <form onSubmit={submit} className="grid gap-4">
              <label className="grid gap-1.5 text-xs font-semibold text-[#43534c]">
                <span>Choose a subject tutor</span>
                <select required value={tutorId} onChange={event => { setTutorId(event.target.value); setResponse(null); }} className="h-10 rounded-lg border border-[#dfe5df] bg-[#fbfcfa] px-3 text-sm text-[#15201c] outline-none focus:border-[#0f5c4f] focus:ring-2 focus:ring-[#0f5c4f]/10">
                  <option value="">Select tutor</option>
                  {hub.data.tutors.map(tutor => <option key={tutor.id} value={tutor.id}>{tutor.subjectName} · {tutor.name}</option>)}
                </select>
              </label>
              {selected && <div className="rounded-xl bg-[#f5faf6] p-3 text-xs leading-5 text-[#65746c]"><p className="font-semibold text-[#29483b]">Approved scope</p><p className="mt-1">{selected.curriculumScope}</p></div>}
              <label className="grid gap-1.5 text-xs font-semibold text-[#43534c]"><span>Your study question</span><textarea required minLength={3} maxLength={1800} value={question} onChange={event => setQuestion(event.target.value)} className="min-h-32 rounded-lg border border-[#dfe5df] bg-[#fbfcfa] px-3 py-2 text-sm text-[#15201c] outline-none focus:border-[#0f5c4f] focus:ring-2 focus:ring-[#0f5c4f]/10" placeholder="Ask about an approved topic. Do not share personal, medical, financial, or safety information here." /></label>
              <div className="flex flex-wrap items-center justify-between gap-3"><p className="max-w-2xl text-[11px] leading-5 text-[#758079]">Your question is used to generate this response but is not stored as a tutor conversation by NSOS.</p><button disabled={ask.isPending || !tutorId} className="inline-flex items-center gap-2 rounded-xl bg-[#0f5c4f] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">{ask.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircleQuestion className="h-4 w-4" />}{ask.isPending ? "Thinking…" : "Ask tutor"}</button></div>
            </form>
          </section>
          {response && <section className="rounded-[1.2rem] border border-[#d8e7dc] bg-white p-5 shadow-[0_10px_32px_rgba(16,45,35,.035)] sm:p-6"><div className="flex gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#e7f2ec] text-[#176145]"><UserRoundCheck className="h-4 w-4" /></span><div><p className="text-sm font-semibold text-[#29483b]">{response.tutorName}</p><p className="mt-1 text-xs text-[#758079]">AI study support — review the explanation and ask a teacher when unsure.</p></div></div><p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-[#40534a]">{response.answer}</p><div className="mt-5 rounded-xl bg-[#f5faf6] p-4"><p className="text-xs font-bold text-[#29483b]">Suggested study steps</p><ol className="mt-2 list-decimal space-y-1 pl-5 text-xs leading-5 text-[#65746c]">{response.studySteps.map((step, index) => <li key={index}>{step}</li>)}</ol></div>{response.needsTeacherSupport && <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[#ead9b6] bg-[#fffaf0] p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#8a5a12]" /><p className="text-xs leading-5 text-[#76521a]">This question needs a supervising teacher’s support. You can request help without storing this tutor conversation.</p></div><button type="button" disabled={support.isPending || !tutorId} onClick={() => support.mutate({ schoolId, tutorId: Number(tutorId) })} className="shrink-0 rounded-lg bg-[#8a5a12] px-3 py-2 text-xs font-bold text-white">Request teacher support</button></div>}</section>}
        </>
      )}

      <section className="rounded-[1.2rem] border border-[#d9e7dc] bg-[#f6fbf7] p-5"><div className="flex gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[#176145]"><ShieldCheck className="h-4 w-4" /></span><div><p className="text-sm font-semibold text-[#29483b]">Keep learning safely</p><p className="mt-1 text-xs leading-5 text-[#65746c]">For personal, health, safety, welfare, assessment, or disciplinary matters, contact a trusted adult or school staff member instead of using the AI tutor.</p></div></div></section>
    </div>
  );
}

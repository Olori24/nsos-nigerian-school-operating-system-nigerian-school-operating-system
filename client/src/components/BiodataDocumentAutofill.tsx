import { AlertCircle, CheckCircle2, ChevronDown, FileUp, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";

export type BiodataAutofillProposal = {
  firstName: string; lastName: string; dateOfBirth: string; gender: string; residentialAddress: string; priorSchool: string;
  guardianName: string; guardianPhone: string; guardianEmail: string; stateOfOrigin: string; localGovernmentOfOrigin: string;
};

const labels: Record<keyof BiodataAutofillProposal, string> = {
  firstName: "First name", lastName: "Last name", dateOfBirth: "Date of birth", gender: "Gender", residentialAddress: "Residential address", priorSchool: "Previous school",
  guardianName: "Parent or guardian name", guardianPhone: "Parent or guardian phone", guardianEmail: "Parent or guardian email", stateOfOrigin: "State of origin", localGovernmentOfOrigin: "Local Government Area of origin",
};

const supportedMimes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

function fileMime(file: File) {
  if (supportedMimes.has(file.type)) return file.type as "image/jpeg" | "image/png" | "image/webp" | "application/pdf";
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  return null;
}

function toBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("The document could not be read in this browser."));
    reader.readAsDataURL(file);
  });
}

export function BiodataDocumentAutofill({ allowedKeys, onApply }: { allowedKeys: Array<keyof BiodataAutofillProposal>; onApply: (values: Partial<BiodataAutofillProposal>) => void }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<(BiodataAutofillProposal & { confidence: "low" | "medium" | "high" }) | null>(null);
  const [selected, setSelected] = useState<Set<keyof BiodataAutofillProposal>>(new Set());
  const extract = trpc.nsos.admissions.extractBiodata.useMutation({
    onSuccess: result => {
      const next = result.proposal as BiodataAutofillProposal & { confidence: "low" | "medium" | "high" };
      setProposal(next);
      setSelected(new Set(allowedKeys.filter(key => Boolean(next[key]))));
      setFile(null);
      setLocalError(null);
    },
  });
  const visibleEntries = useMemo(() => proposal ? allowedKeys.filter(key => Boolean(proposal[key])).map(key => [key, proposal[key]] as const) : [], [allowedKeys, proposal]);
  const selectFile = (next: File | null) => {
    setProposal(null); setSelected(new Set()); setLocalError(null); setFile(null);
    if (!next) return;
    if (!fileMime(next)) { setLocalError("Choose a JPG, PNG, WEBP, or PDF document."); return; }
    if (!next.size || next.size > 4 * 1024 * 1024) { setLocalError("Choose a document no larger than 4 MB."); return; }
    setFile(next);
  };
  const analyse = async () => {
    if (!file || !consent) return;
    const mimeType = fileMime(file);
    if (!mimeType) { setLocalError("Choose a supported document type."); return; }
    try { extract.mutate({ upload: { base64: await toBase64(file), fileName: file.name, mimeType } }); } catch (error) { setLocalError(error instanceof Error ? error.message : "The document could not be read in this browser."); }
  };
  const apply = () => {
    if (!proposal) return;
    const values = Object.fromEntries(Array.from(selected).map((key: keyof BiodataAutofillProposal) => [key, proposal[key]])) as Partial<BiodataAutofillProposal>;
    onApply(values);
    setOpen(false); setProposal(null); setSelected(new Set()); setConsent(false); setLocalError(null);
  };
  return <section className="biodata-autofill rounded-xl border border-[#d6e5da] bg-[#f7fbf7] p-4 dark:border-[#3d604e] dark:bg-[#183126]">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="inline-flex items-center gap-2 text-sm font-bold text-[#1d563d] dark:text-[#b7e4c5]"><Sparkles className="h-4 w-4" />Auto-fill from a document</p><p className="mt-1 max-w-2xl text-xs leading-5 text-[#527064] dark:text-[#c3d8cb]">Upload a resume or ID document to receive editable suggestions. The document is used only for this extraction, is not attached to the form, and is not stored by NSOS.</p></div><button type="button" aria-expanded={open} onClick={() => setOpen(value => !value)} className="inline-flex items-center gap-2 rounded-lg border border-[#b9d6c2] bg-white px-3 py-2 text-xs font-bold text-[#1a6647] hover:bg-[#edf8ef] dark:border-[#477158] dark:bg-[#20352a] dark:text-[#b7e4c5] dark:hover:bg-[#294535]">{open ? "Close auto-fill" : "Use a document"}<ChevronDown className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} /></button></div>
    {open && <div className="mt-4 grid gap-4 border-t border-[#dce9df] pt-4 dark:border-[#3b5a48]">{!proposal ? <><label className="grid gap-2 text-xs font-semibold text-[#37574a] dark:text-[#d5e8da]"><span>Resume or ID document <span className="font-normal text-[#60776c] dark:text-[#adc6b5]">(JPG, PNG, WEBP, or PDF; up to 4 MB)</span></span><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={event => selectFile(event.target.files?.[0] ?? null)} className="block w-full rounded-lg border border-[#c9dace] bg-white px-3 py-2 text-xs file:mr-3 file:rounded-md file:border-0 file:bg-[#dceee3] file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-[#123b31] dark:border-[#405e4b] dark:bg-[#111c17] dark:file:bg-[#315840] dark:file:text-[#e2f3e8]" /></label>{file && <p className="text-xs text-[#416658] dark:text-[#cae1d1]">Selected: <span className="font-bold">{file.name}</span></p>}<label className="flex items-start gap-2 text-xs leading-5 text-[#48665a] dark:text-[#c7ddce]"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#0f5c4f]" /><span>I have permission to use this document, and I understand NSOS will return suggestions for my review. It will not submit the form automatically.</span></label><button type="button" disabled={!file || !consent || extract.isPending} onClick={analyse} className="w-fit inline-flex items-center gap-2 rounded-xl bg-[#0f5c4f] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">{extract.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}{extract.isPending ? "Reading document…" : "Extract biodata suggestions"}</button></> : <><div className="flex items-start gap-3 rounded-lg border border-[#b8dac3] bg-white p-3 text-xs leading-5 text-[#356249] dark:border-[#426e53] dark:bg-[#1b2c22] dark:text-[#c9e4d1]"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /><p><span className="font-bold">Review required.</span> The AI returned {proposal.confidence} confidence suggestions. Choose the fields to apply; you can edit every value afterward.</p></div>{visibleEntries.length ? <div className="grid gap-2 sm:grid-cols-2">{visibleEntries.map(([key, value]) => <label key={key} className="flex items-start gap-2 rounded-lg border border-[#d8e6dc] bg-white px-3 py-2.5 text-xs text-[#344f43] dark:border-[#3f5c4a] dark:bg-[#1b2c22] dark:text-[#d6e8db]"><input type="checkbox" checked={selected.has(key)} onChange={event => setSelected(current => { const next = new Set(current); event.target.checked ? next.add(key) : next.delete(key); return next; })} className="mt-0.5 h-4 w-4 accent-[#0f5c4f]" /><span><span className="block text-[10px] font-bold uppercase tracking-[.1em] text-[#698276] dark:text-[#a9c2b1]">{labels[key]}</span><span className="mt-0.5 block font-semibold">{value}</span></span></label>)}</div> : <p className="flex items-center gap-2 rounded-lg border border-[#efcfca] bg-[#fff8f7] px-3 py-2.5 text-xs text-[#933f37] dark:border-[#744b46] dark:bg-[#30211f] dark:text-[#ffb8af]"><AlertCircle className="h-4 w-4" />No applicable biodata fields were found. Complete the form manually.</p>}<div className="flex flex-wrap gap-3"><button type="button" disabled={!selected.size} onClick={apply} className="inline-flex items-center gap-2 rounded-xl bg-[#0f5c4f] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"><CheckCircle2 className="h-4 w-4" />Apply selected suggestions</button><button type="button" onClick={() => { setProposal(null); setSelected(new Set()); }} className="rounded-xl border border-[#c9d9cf] bg-white px-4 py-2.5 text-sm font-bold text-[#456155] dark:border-[#476250] dark:bg-[#1c2d24] dark:text-[#d7e8dc]">Use another document</button></div></>}</div>}
    {(localError || extract.error) && <p role="alert" className="mt-3 flex items-center gap-2 text-xs font-medium text-[#a13e38] dark:text-[#ffb2aa]"><AlertCircle className="h-4 w-4" />{localError || extract.error?.message}</p>}
  </section>;
}

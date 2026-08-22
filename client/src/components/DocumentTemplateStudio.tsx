import { trpc } from "@/lib/trpc";
import { ImageIcon, Plus, Save, School, ShieldCheck, Trash2, WalletCards } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type FeeBand = { category: string; tuitionFee: number };
type TemplateDraft = {
  admissionTitle: string;
  headerTagline: string;
  headerLogoUrl: string;
  headerAddressLine: string;
  headerContactLine: string;
  admissionFields: string[];
  declarationText: string;
  requireDeclaration: boolean;
  requirePassportPhoto: boolean;
  requireAdmissionFeeReceipt: boolean;
  termlyFeeTitle: string;
  feeSchedule: FeeBand[];
};

const fieldOptions = [["middleName", "Applicant middle name"], ["dateOfBirth", "Date of birth"], ["placeOfBirth", "Place of birth"], ["nationality", "Nationality"], ["homeTown", "Home town"], ["stateOfOrigin", "State of origin"], ["localGovernmentOfOrigin", "Local Government Area of origin"], ["gender", "Gender"], ["residentialAddress", "Residential address"], ["postalAddress", "Postal address"], ["priorSchool", "Previous school"], ["currentClass", "Current class"], ["religion", "Religion"], ["medicalHistory", "Relevant medical history"], ["familyDoctor", "Family doctor or clinic"], ["guardianOccupation", "Guardian occupation"], ["guardianOfficeAddress", "Guardian office address"]] as const;

const sampleTemplate: TemplateDraft = {
  admissionTitle: "School admission form",
  headerTagline: "Nursery · Primary · College",
  headerLogoUrl: "",
  headerAddressLine: "",
  headerContactLine: "",
  admissionFields: ["middleName", "dateOfBirth", "placeOfBirth", "nationality", "homeTown", "stateOfOrigin", "localGovernmentOfOrigin", "gender", "residentialAddress", "priorSchool", "currentClass", "medicalHistory", "guardianOccupation"],
  declarationText: "I confirm that the information provided is accurate to the best of my knowledge and I understand that the school will use it only for admissions and student-support purposes.",
  requireDeclaration: true,
  requirePassportPhoto: false,
  requireAdmissionFeeReceipt: false,
  termlyFeeTitle: "Termly fee guide",
  feeSchedule: [{ category: "Kindergarten", tuitionFee: 15000 }, { category: "Nursery", tuitionFee: 16000 }, { category: "Primary 1–3", tuitionFee: 18000 }, { category: "Primary 4–6", tuitionFee: 20000 }, { category: "JSS 1–2", tuitionFee: 22000 }, { category: "JSS 3", tuitionFee: 25000 }, { category: "SSS 1–2", tuitionFee: 17000 }, { category: "SSS 3", tuitionFee: 20000 }],
};

const inputClass = "h-10 w-full rounded-lg border border-[#dfe5df] bg-white px-3 text-sm text-[#15201c] outline-none transition focus:border-[#0f5c4f] focus:ring-2 focus:ring-[#0f5c4f]/10";

function draftFrom(data: any): TemplateDraft {
  return {
    admissionTitle: data?.admissionTitle ?? sampleTemplate.admissionTitle,
    headerTagline: data?.headerTagline ?? sampleTemplate.headerTagline,
    headerLogoUrl: data?.headerLogoUrl ?? "",
    headerAddressLine: data?.headerAddressLine ?? "",
    headerContactLine: data?.headerContactLine ?? "",
    admissionFields: Array.isArray(data?.admissionFields) ? data.admissionFields : sampleTemplate.admissionFields,
    declarationText: data?.declarationText ?? sampleTemplate.declarationText,
    requireDeclaration: data?.requireDeclaration ?? sampleTemplate.requireDeclaration,
    requirePassportPhoto: data?.requirePassportPhoto ?? sampleTemplate.requirePassportPhoto,
    requireAdmissionFeeReceipt: data?.requireAdmissionFeeReceipt ?? sampleTemplate.requireAdmissionFeeReceipt,
    termlyFeeTitle: data?.termlyFeeTitle ?? sampleTemplate.termlyFeeTitle,
    feeSchedule: Array.isArray(data?.feeSchedule) ? data.feeSchedule.map((item: any) => ({ category: String(item.category ?? ""), tuitionFee: Number(item.tuitionFee ?? 0) })) : sampleTemplate.feeSchedule,
  };
}

function HeaderPreview({ draft }: { draft: TemplateDraft }) {
  return <div className="overflow-hidden rounded-xl border border-[#d7e3da] bg-white shadow-sm"><div className="border-b-4 border-[#0f5c4f] px-4 py-4"><div className="flex items-start gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-[#dce9df] bg-[#edf5ee] text-[#0f5c4f]">{draft.headerLogoUrl ? <img src={draft.headerLogoUrl} alt="Letterhead logo preview" referrerPolicy="no-referrer" className="h-full w-full object-cover" onError={event => { event.currentTarget.style.display = "none"; }} /> : <School className="h-5 w-5" />}</span><div className="min-w-0"><p className="truncate text-sm font-bold tracking-[.02em] text-[#18352a]">Your school name</p><p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[.12em] text-[#277264]">{draft.headerTagline || "School strapline"}</p>{draft.headerAddressLine && <p className="mt-2 text-[11px] text-[#52665c]">{draft.headerAddressLine}</p>}{draft.headerContactLine && <p className="mt-0.5 text-[11px] text-[#52665c]">{draft.headerContactLine}</p>}</div></div></div><div className="px-4 py-3 text-center"><p className="text-xs font-semibold text-[#465b50]">{draft.admissionTitle || "School admission form"}</p></div></div>;
}

export function AdmissionTemplateCard({ schoolId }: { schoolId: number }) {
  const query = trpc.nsos.documentTemplates.get.useQuery({ schoolId });
  const save = trpc.nsos.documentTemplates.save.useMutation();
  const [draft, setDraft] = useState<TemplateDraft>(sampleTemplate);
  useEffect(() => { if (query.data) setDraft(draftFrom(query.data)); }, [query.data]);

  const toggleField = (id: string) => setDraft(current => ({ ...current, admissionFields: current.admissionFields.includes(id) ? current.admissionFields.filter(item => item !== id) : [...current.admissionFields, id] }));
  const updateBand = (index: number, key: keyof FeeBand, value: string) => setDraft(current => ({ ...current, feeSchedule: current.feeSchedule.map((band, itemIndex) => itemIndex === index ? { ...band, [key]: key === "tuitionFee" ? Number(value) : value } : band) }));
  const saveTemplate = () => {
    if (draft.feeSchedule.some(band => !band.category.trim() || !Number.isFinite(band.tuitionFee) || band.tuitionFee <= 0)) return toast.error("Give every fee band a name and a positive tuition amount before saving.");
    if (draft.headerLogoUrl && !/^https:\/\//i.test(draft.headerLogoUrl.trim())) return toast.error("Use an HTTPS logo URL for the public letterhead.");
    save.mutate({ schoolId, ...draft, admissionFields: draft.admissionFields as any, headerTagline: draft.headerTagline || undefined, headerLogoUrl: draft.headerLogoUrl || undefined, headerAddressLine: draft.headerAddressLine || undefined, headerContactLine: draft.headerContactLine || undefined, declarationText: draft.declarationText || undefined, feeSchedule: draft.feeSchedule.map(band => ({ category: band.category.trim(), tuitionFee: band.tuitionFee })) }, { onSuccess: () => { toast.success("Reusable school document template saved."); query.refetch(); }, onError: error => toast.error(error.message) });
  };

  return <section className="overflow-hidden rounded-[1.2rem] border border-[#d8e7dc] bg-[#fbfdf9] shadow-[0_10px_32px_rgba(16,45,35,0.035)]"><div className="flex flex-col gap-4 border-b border-[#dfe9e1] bg-[#eef6f0] px-5 py-5 sm:flex-row sm:items-start sm:justify-between"><div className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[#0f5c4f] shadow-sm"><ShieldCheck className="h-5 w-5" /></span><div><p className="text-sm font-semibold text-[#203d31]">Reusable admission & document template</p><p className="mt-1 max-w-2xl text-xs leading-5 text-[#607169]">School owners control which information and evidence the public admission form requires. No fee is approved automatically.</p></div></div><button disabled={save.isPending || query.isLoading} onClick={saveTemplate} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0f5c4f] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"><Save className="h-4 w-4" />{save.isPending ? "Saving…" : "Save template"}</button></div><div className="grid gap-7 p-5 sm:p-6"><div className="grid gap-5 xl:grid-cols-[1fr_.9fr]"><div className="grid gap-4"><div className="grid gap-4 md:grid-cols-2"><Label text="Admissions form title"><input className={inputClass} value={draft.admissionTitle} onChange={event => setDraft(current => ({ ...current, admissionTitle: event.target.value }))} /></Label><Label text="Header tagline"><input className={inputClass} value={draft.headerTagline} onChange={event => setDraft(current => ({ ...current, headerTagline: event.target.value }))} placeholder="Nursery · Primary · College" /></Label></div><Label text="School logo URL (optional, HTTPS only)"><div className="relative"><ImageIcon className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#7a847e]" /><input className={`${inputClass} pl-9`} type="url" value={draft.headerLogoUrl} onChange={event => setDraft(current => ({ ...current, headerLogoUrl: event.target.value }))} placeholder="https://…" /></div></Label><Label text="Letterhead address line (optional)"><input className={inputClass} value={draft.headerAddressLine} onChange={event => setDraft(current => ({ ...current, headerAddressLine: event.target.value }))} placeholder="Campus or postal address" /></Label><Label text="Letterhead contact line (optional)"><input className={inputClass} value={draft.headerContactLine} onChange={event => setDraft(current => ({ ...current, headerContactLine: event.target.value }))} placeholder="Phone · email · website" /></Label></div><div><p className="mb-2 text-xs font-semibold uppercase tracking-[.12em] text-[#6d7d73]">Public letterhead preview</p><HeaderPreview draft={draft} /><p className="mt-2 text-[11px] leading-4 text-[#758079]">These fields are public only on this school’s admissions form. Never enter private staff or family information here.</p></div></div><div><p className="text-xs font-semibold text-[#43534c]">Optional fields on the public admissions form</p><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{fieldOptions.map(([id, label]) => <label key={id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#e0e7df] bg-white px-3 py-2.5 text-xs text-[#405249]"><input type="checkbox" checked={draft.admissionFields.includes(id)} onChange={() => toggleField(id)} className="h-4 w-4 accent-[#0f5c4f]" />{label}</label>)}</div></div><div className="rounded-xl border border-[#e0e7df] bg-white p-4"><label className="flex items-center gap-2 text-xs font-semibold text-[#43534c]"><input type="checkbox" checked={draft.requireDeclaration} onChange={event => setDraft(current => ({ ...current, requireDeclaration: event.target.checked }))} className="h-4 w-4 accent-[#0f5c4f]" />Require a parent or guardian declaration</label><textarea className={`${inputClass} mt-3 min-h-24 h-auto py-3`} value={draft.declarationText} onChange={event => setDraft(current => ({ ...current, declarationText: event.target.value }))} /></div><div className="rounded-xl border border-[#e0e7df] bg-white p-4"><p className="text-xs font-semibold text-[#43534c]">Admissions uploads</p><p className="mt-1 text-[11px] leading-5 text-[#758079]">Choose only the evidence this school requires. Receipt upload records evidence for review; it never approves a fee payment automatically.</p><div className="mt-3 grid gap-2 sm:grid-cols-2"><UploadRequirement checked={draft.requirePassportPhoto} onChange={checked => setDraft(current => ({ ...current, requirePassportPhoto: checked }))} title="Require passport photograph" detail="JPEG, PNG, or WebP; maximum 3 MB." /><UploadRequirement checked={draft.requireAdmissionFeeReceipt} onChange={checked => setDraft(current => ({ ...current, requireAdmissionFeeReceipt: checked }))} title="Require admission-fee receipt" detail="JPEG, PNG, WebP, or PDF; maximum 4 MB." /></div></div><div><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-[#294239]">Sample termly fee guide</p><p className="mt-1 text-xs text-[#758079]">Review every amount before adopting the guide into draft fee structures.</p></div><Label text="Guide title"><input className={`${inputClass} min-w-48`} value={draft.termlyFeeTitle} onChange={event => setDraft(current => ({ ...current, termlyFeeTitle: event.target.value }))} /></Label></div><div className="mt-4 grid gap-2">{draft.feeSchedule.map((band, index) => <div key={`${index}-${band.category}`} className="grid gap-2 rounded-lg border border-[#e0e7df] bg-white p-3 sm:grid-cols-[1fr_180px_auto]"><input aria-label={`Fee band ${index + 1}`} className={inputClass} value={band.category} onChange={event => updateBand(index, "category", event.target.value)} /><input aria-label={`Tuition fee for ${band.category || `band ${index + 1}`}`} type="number" min="1" className={inputClass} value={band.tuitionFee || ""} onChange={event => updateBand(index, "tuitionFee", event.target.value)} /><button type="button" onClick={() => setDraft(current => ({ ...current, feeSchedule: current.feeSchedule.filter((_, itemIndex) => itemIndex !== index) }))} disabled={draft.feeSchedule.length === 1} className="inline-flex h-10 items-center justify-center rounded-lg px-3 text-[#a13e38] hover:bg-[#fdf0ee] disabled:opacity-40"><Trash2 className="h-4 w-4" /><span className="sr-only">Remove fee band</span></button></div>)}</div><button type="button" onClick={() => setDraft(current => ({ ...current, feeSchedule: [...current.feeSchedule, { category: "New category", tuitionFee: 0 }] }))} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#cfe1d4] bg-white px-3 py-2 text-xs font-semibold text-[#176145]"><Plus className="h-3.5 w-3.5" />Add fee band</button></div></div></section>;
}

export function FeeScheduleTemplateCard({ schoolId, academics, onDone }: { schoolId: number; academics: any; onDone: () => void }) {
  const query = trpc.nsos.documentTemplates.get.useQuery({ schoolId });
  const adopt = trpc.nsos.documentTemplates.adoptFeeSchedule.useMutation({ onSuccess: result => { toast.success(`${result.createdCount} draft fee structures created. No invoices were issued.`); onDone(); }, onError: error => toast.error(error.message) });
  const [termId, setTermId] = useState("");
  const [classId, setClassId] = useState("");
  const template = draftFrom(query.data);
  return <section className="rounded-[1.2rem] border border-[#e3dbc9] bg-[#fffdf7] p-5 shadow-[0_10px_32px_rgba(16,45,35,0.035)] sm:p-6"><div className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[#8a5a12] shadow-sm"><WalletCards className="h-5 w-5" /></span><div><p className="text-sm font-semibold text-[#493819]">Saved termly fee guide</p><p className="mt-1 text-xs leading-5 text-[#75684c]">Adoption creates only draft fee structures; a school must still review and activate them before use.</p></div></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{template.feeSchedule.map(band => <div key={band.category} className="flex items-center justify-between rounded-lg border border-[#eee5d3] bg-white px-3 py-2.5 text-xs"><span className="font-medium text-[#4d4a40]">{band.category}</span><span className="font-bold text-[#76521a]">₦{new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 }).format(band.tuitionFee)}</span></div>)}</div><div className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto]"><Label text="Academic term"><select required className={inputClass} value={termId} onChange={event => setTermId(event.target.value)}><option value="">Select term</option>{academics?.terms?.map((item: any) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></Label><Label text="Class scope (optional)"><select className={inputClass} value={classId} onChange={event => setClassId(event.target.value)}><option value="">All applicable classes</option>{academics?.classes?.map((item: any) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></Label><button disabled={!termId || adopt.isPending} onClick={() => adopt.mutate({ schoolId, termId: Number(termId), classId: classId ? Number(classId) : undefined })} className="self-end rounded-xl bg-[#8a5a12] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{adopt.isPending ? "Creating drafts…" : "Create draft fees"}</button></div></section>;
}

function UploadRequirement({ checked, onChange, title, detail }: { checked: boolean; onChange: (checked: boolean) => void; title: string; detail: string }) {
  return <label className="flex items-start gap-2 rounded-lg border border-[#e0e7df] bg-[#fbfcfa] px-3 py-3 text-xs text-[#405249]"><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#0f5c4f]" /><span><strong className="block text-[#294239]">{title}</strong><span className="mt-1 block text-[#758079]">{detail}</span></span></label>;
}

function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return <label className="grid gap-1.5 text-xs font-semibold text-[#43534c]"><span>{text}</span>{children}</label>;
}

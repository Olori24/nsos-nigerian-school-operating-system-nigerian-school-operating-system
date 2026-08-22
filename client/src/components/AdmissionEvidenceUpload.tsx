import { FileCheck2, Loader2, Trash2, UploadCloud } from "lucide-react";
import { useState } from "react";

export type AdmissionEvidence = {
  type: "passport_photo" | "admission_fee_receipt";
  fileName: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "application/pdf";
  base64: string;
};

const mimeDescriptions: Record<AdmissionEvidence["mimeType"], string> = {
  "image/jpeg": "JPEG image",
  "image/png": "PNG image",
  "image/webp": "WebP image",
  "application/pdf": "PDF document",
};

export function AdmissionEvidenceUpload({ type, required, value, onChange }: { type: AdmissionEvidence["type"]; required: boolean; value?: AdmissionEvidence; onChange: (value?: AdmissionEvidence) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const isPassport = type === "passport_photo";
  const title = isPassport ? "Passport photograph" : "Admission-fee receipt";
  const allowedMimeTypes: AdmissionEvidence["mimeType"][] = isPassport ? ["image/jpeg", "image/png", "image/webp"] : ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  const maximumBytes = isPassport ? 3 * 1024 * 1024 : 4 * 1024 * 1024;

  const selectFile = (file?: File) => {
    setError(null);
    if (!file) return;
    if (!allowedMimeTypes.includes(file.type as AdmissionEvidence["mimeType"])) {
      setError(isPassport ? "Choose a JPEG, PNG, or WebP passport photograph." : "Choose a JPEG, PNG, WebP, or PDF receipt.");
      return;
    }
    if (!file.size || file.size > maximumBytes) {
      setError(`${title} must be no larger than ${isPassport ? "3" : "4"} MB.`);
      return;
    }
    setReading(true);
    const reader = new FileReader();
    reader.onerror = () => { setReading(false); setError("NSOS could not read that file. Please choose it again."); };
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const base64 = result.includes(",") ? result.split(",", 2)[1] ?? "" : "";
      if (!base64) { setError("NSOS could not prepare that file for upload. Please choose it again."); setReading(false); return; }
      onChange({ type, fileName: file.name.slice(0, 180), mimeType: file.type as AdmissionEvidence["mimeType"], base64 });
      setReading(false);
    };
    reader.readAsDataURL(file);
  };

  return <section className="rounded-xl border border-[#dce8dd] bg-[#f8fbf7] p-4" aria-labelledby={`${type}-heading`}>
    <div className="flex gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#e1f0e4] text-[#176145]"><UploadCloud className="h-4 w-4" aria-hidden="true" /></span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2"><h2 id={`${type}-heading`} className="text-sm font-semibold text-[#294239]">{title}</h2>{required && <span className="rounded-full bg-[#f8e8e5] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[.08em] text-[#a13e38]">Required</span>}</div>
        <p className="mt-1 text-xs leading-5 text-[#68786e]">{isPassport ? "Upload a clear recent photograph in JPEG, PNG, or WebP format (maximum 3 MB)." : "Upload payment evidence in JPEG, PNG, WebP, or PDF format (maximum 4 MB). This is reviewed by the school and does not approve a payment automatically."}</p>
      </div>
    </div>
    {value ? <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#cddfd0] bg-white px-3 py-2.5"><div className="flex min-w-0 items-center gap-2"><FileCheck2 className="h-4 w-4 shrink-0 text-[#176145]" aria-hidden="true" /><span className="truncate text-xs font-semibold text-[#365346]">{value.fileName}</span><span className="text-[10px] text-[#718078]">{mimeDescriptions[value.mimeType]}</span></div><button type="button" onClick={() => onChange(undefined)} className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-bold text-[#a13e38] hover:bg-[#fdf0ee]"><Trash2 className="h-3.5 w-3.5" aria-hidden="true" />Remove</button></div> : <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[#a6c7ad] bg-white px-3 py-3 text-xs font-semibold text-[#176145] transition hover:bg-[#f1f8f2]"><input required={required} type="file" className="sr-only" accept={isPassport ? "image/jpeg,image/png,image/webp" : "image/jpeg,image/png,image/webp,application/pdf"} onChange={event => selectFile(event.target.files?.[0])} /><UploadCloud className="h-4 w-4" aria-hidden="true" />Choose {isPassport ? "photograph" : "receipt"}</label>}
    {reading && <p className="mt-3 flex items-center gap-2 text-xs font-medium text-[#55736a]"><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />Preparing secure upload…</p>}
    {error && <p role="alert" className="mt-3 rounded-lg border border-[#f1cbc5] bg-[#fff7f5] px-3 py-2 text-xs leading-5 text-[#933e37]">{error}</p>}
  </section>;
}

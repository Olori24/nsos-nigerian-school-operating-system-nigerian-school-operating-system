import { Download, FileText, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { completedBiodataFields, exportBiodataPdf, type BiodataPreviewField } from "@/lib/biodataPdf";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function BiodataPreviewDialog({ title, subtitle, fields }: { title: string; subtitle?: string; fields: BiodataPreviewField[] }) {
  const [open, setOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const completedFields = useMemo(() => completedBiodataFields(fields), [fields]);

  const download = async () => {
    setError(null);
    setIsExporting(true);
    try {
      await exportBiodataPdf({ title, subtitle, fields });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The PDF could not be generated in this browser. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return <><button type="button" onClick={() => { setError(null); setOpen(true); }} className="inline-flex items-center gap-2 rounded-xl border border-[#cbd9d0] bg-white px-4 py-2.5 text-sm font-bold text-[#0f5c4f] transition hover:bg-[#f2f7f3]"><FileText className="h-4 w-4" />Preview &amp; export PDF</button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto border-[#dfe5df] bg-[#fbfcfa] p-0"><DialogHeader className="border-b border-[#e4e9e4] bg-white px-6 py-5 text-left sm:px-7"><DialogTitle className="text-xl text-[#20342c]">{title}</DialogTitle><DialogDescription className="mt-1 text-sm leading-6 text-[#6c7972]">Review the completed biodata below before submission. Exporting the PDF happens in this browser and does not submit the form.</DialogDescription></DialogHeader><div className="px-6 py-5 sm:px-7">{completedFields.length ? <dl className="grid gap-3 sm:grid-cols-2">{completedFields.map(field => <div key={field.label} className="rounded-xl border border-[#e1e8e1] bg-white px-3.5 py-3"><dt className="text-[10px] font-bold uppercase tracking-[.11em] text-[#728078]">{field.label}</dt><dd className="mt-1 text-sm font-medium leading-5 text-[#243b31]">{field.value}</dd></div>)}</dl> : <p className="rounded-xl border border-dashed border-[#cfd9d1] bg-white px-4 py-5 text-sm leading-6 text-[#68776f]">Complete at least one field to see it in the preview and export it as a PDF.</p>}{error && <p role="alert" className="mt-4 rounded-lg border border-[#f0c9c4] bg-[#fff7f5] px-3 py-2 text-xs leading-5 text-[#8f3b35]">{error}</p>}<p className="mt-4 text-xs leading-5 text-[#708077]">Only completed fields are shown. Blank fields are not included in the preview or PDF.</p></div><DialogFooter className="border-t border-[#e4e9e4] bg-white px-6 py-4 sm:px-7"><button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-[#d5dfd7] px-4 py-2.5 text-sm font-bold text-[#486057] hover:bg-[#f7f9f6]">Continue editing</button><button type="button" disabled={!completedFields.length || isExporting} onClick={download} className="inline-flex items-center gap-2 rounded-xl bg-[#0f5c4f] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">{isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}{isExporting ? "Generating PDF…" : "Export PDF"}</button></DialogFooter></DialogContent></Dialog></>;
}

import { trpc } from "@/lib/trpc";
import { AlertTriangle, CheckCircle2, Copy, FileSpreadsheet, Loader2, ShieldCheck, UploadCloud } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type ImportRow = {
  sourceRow: number;
  admissionNo: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth?: string;
  gender?: string;
  email?: string;
  phone?: string;
  guardianFirstName?: string;
  guardianLastName?: string;
  guardianRelationship?: string;
  guardianEmail?: string;
  guardianPhone?: string;
};

const template = "admissionNo,firstName,lastName,middleName,dateOfBirth,gender,email,phone,guardianFirstName,guardianLastName,guardianRelationship,guardianEmail,guardianPhone";
const headerAliases: Record<string, keyof Omit<ImportRow, "sourceRow">> = {
  admissionno: "admissionNo", admissionnumber: "admissionNo", firstname: "firstName", lastname: "lastName", middlename: "middleName", dateofbirth: "dateOfBirth", gender: "gender", email: "email", phone: "phone", guardianfirstname: "guardianFirstName", guardianlastname: "guardianLastName", guardianrelationship: "guardianRelationship", guardianemail: "guardianEmail", guardianphone: "guardianPhone",
};

function splitDelimitedLine(line: string, delimiter: string) {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (character === delimiter && !quoted) {
      values.push(value.trim());
      value = "";
    } else value += character;
  }
  values.push(value.trim());
  return values;
}

export function parseStudentMigrationText(text: string): { rows: ImportRow[]; error?: string } {
  const lines = text.replace(/\r/g, "").split("\n").filter(line => line.trim());
  if (lines.length < 2) return { rows: [], error: "Paste a header row and at least one student row." };
  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const headings = splitDelimitedLine(lines[0], delimiter).map(value => headerAliases[value.toLowerCase().replace(/[^a-z]/g, "")] ?? null);
  if (!headings.includes("admissionNo") || !headings.includes("firstName") || !headings.includes("lastName")) return { rows: [], error: "Use the required headers: admissionNo, firstName, lastName." };
  return {
    rows: lines.slice(1, 101).map((line, index) => {
      const values = splitDelimitedLine(line, delimiter);
      const row: ImportRow = { sourceRow: index + 2, admissionNo: "", firstName: "", lastName: "" };
      headings.forEach((heading, headingIndex) => {
        if (!heading) return;
        const value = values[headingIndex]?.trim() || undefined;
        (row as Record<string, unknown>)[heading] = value;
      });
      return row;
    }),
  };
}

export function StudentMigrationWorkspace({ schoolId, academic, onDone }: { schoolId: number; academic: any; onDone: () => void }) {
  const [classId, setClassId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [admittedOn, setAdmittedOn] = useState(new Date().toISOString().slice(0, 10));
  const [csv, setCsv] = useState("");
  const [reviewedRows, setReviewedRows] = useState<ImportRow[]>([]);
  const [review, setReview] = useState<any>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  const history = trpc.nsos.students.migrationHistory.useQuery({ schoolId });
  const preview = trpc.nsos.students.migrationPreview.useMutation({
    onSuccess: result => { setReview(result); setConfirmed(false); },
    onError: error => toast.error(error.message),
  });
  const importRows = trpc.nsos.students.migrationImport.useMutation({
    onSuccess: result => {
      toast.success(`${result.studentCount} student record${result.studentCount === 1 ? "" : "s"} imported.`);
      setCsv(""); setReview(null); setReviewedRows([]); setConfirmed(false); setIdempotencyKey(crypto.randomUUID());
      void history.refetch(); onDone();
    },
    onError: error => toast.error(error.message),
  });
  const parsed = useMemo(() => parseStudentMigrationText(csv), [csv]);
  const reviewRows = () => {
    if (!classId || !sessionId) return toast.error("Choose the target class and academic session before reviewing the rows.");
    if (parsed.error) return toast.error(parsed.error);
    setReviewedRows(parsed.rows);
    preview.mutate({ schoolId, classId: Number(classId), sessionId: Number(sessionId), rows: parsed.rows });
  };
  const copyTemplate = async () => {
    try { await navigator.clipboard.writeText(template); toast.success("Required import headers copied."); }
    catch { toast.message("Copy the header line shown below."); }
  };

  return <section className="overflow-hidden rounded-[1.2rem] border border-[#cbded0] bg-[linear-gradient(135deg,#f0faf3_0%,#fffdfa_60%,#f5faf7_100%)] shadow-[0_10px_28px_rgba(23,79,55,.05)]">
    <div className="flex flex-col gap-4 border-b border-[#dcebe0] p-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0f5c4f] text-white"><FileSpreadsheet className="h-5 w-5" /></span>
        <div>
          <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-bold text-[#244333]">Secure student migration</p><span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-[.09em] text-[#176145]">Review first</span></div>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-[#60746a]">Bring school-approved spreadsheet rows into NSOS without retyping. Rows are validated before anything is created; source data is not sent to an AI or stored as a raw file.</p>
        </div>
      </div>
      <span className="inline-flex w-fit items-center gap-1.5 text-[11px] font-semibold text-[#176145]"><ShieldCheck className="h-4 w-4" />Owner approval required</span>
    </div>

    <div className="grid gap-4 p-5">
      <div className="grid gap-3 md:grid-cols-3">
        <label className="grid gap-1 text-[11px] font-bold text-[#43554b]"><span>Target class</span><select className="h-10 rounded-lg border border-[#d8e4da] bg-white px-3 text-xs" value={classId} onChange={event => { setClassId(event.target.value); setReview(null); }}><option value="">Select class</option>{academic?.classes?.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="grid gap-1 text-[11px] font-bold text-[#43554b]"><span>Academic session</span><select className="h-10 rounded-lg border border-[#d8e4da] bg-white px-3 text-xs" value={sessionId} onChange={event => { setSessionId(event.target.value); setReview(null); }}><option value="">Select session</option>{academic?.sessions?.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="grid gap-1 text-[11px] font-bold text-[#43554b]"><span>Admission date for this batch</span><input type="date" className="h-10 rounded-lg border border-[#d8e4da] bg-white px-3 text-xs" value={admittedOn} onChange={event => setAdmittedOn(event.target.value)} /></label>
      </div>

      <div className="rounded-xl border border-[#d7e6da] bg-white p-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-bold text-[#304c3d]">Paste CSV or spreadsheet rows</p><button type="button" onClick={copyTemplate} className="inline-flex items-center gap-1.5 rounded-lg border border-[#b7d2be] px-2.5 py-1.5 text-[10px] font-bold text-[#176145]"><Copy className="h-3 w-3" />Copy required headers</button></div>
        <p className="mt-1 break-all font-mono text-[9px] leading-4 text-[#718078]">{template}</p>
        <textarea value={csv} onChange={event => { setCsv(event.target.value); setReview(null); }} placeholder={template} className="mt-3 min-h-36 w-full rounded-lg border border-[#dce5de] bg-[#fbfcfa] p-3 font-mono text-[11px] leading-5 text-[#34483e] outline-none focus:border-[#0f5c4f] focus:ring-2 focus:ring-[#0f5c4f]/10" />
      </div>
      {parsed.error && csv.trim() && <p className="inline-flex items-center gap-1.5 text-xs text-[#a3463d]"><AlertTriangle className="h-3.5 w-3.5" />{parsed.error}</p>}
      <div className="flex flex-wrap items-center gap-3"><button type="button" onClick={reviewRows} disabled={!csv.trim() || preview.isPending} className="inline-flex items-center gap-2 rounded-xl bg-[#0f5c4f] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-55">{preview.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}{preview.isPending ? "Reviewing rows…" : "Validate migration rows"}</button><span className="text-[11px] text-[#66786e]">Maximum 100 rows per batch. Repeated confirmation of the same reviewed batch is safe.</span></div>

      {review && <div className={`rounded-xl border p-4 ${review.errorCount ? "border-[#ebc6c1] bg-[#fff8f6]" : "border-[#badbc2] bg-[#f7fcf8]"}`}>
        <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-bold text-[#304b3c]">Migration review</p><p className="mt-1 text-[11px] text-[#677b70]">{review.readyCount} ready · {review.errorCount} row{review.errorCount === 1 ? "" : "s"} need attention</p></div>{!review.errorCount && <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#27734d]"><CheckCircle2 className="h-4 w-4" />Ready for your final confirmation</span>}</div>
        <div className="mt-3 max-h-48 overflow-auto rounded-lg border border-black/5 bg-white"><table className="w-full min-w-[500px] text-left text-[11px]"><thead className="sticky top-0 bg-[#f7faf6] text-[9px] uppercase tracking-[.1em] text-[#718079]"><tr><th className="px-3 py-2">Row</th><th className="px-3 py-2">Student</th><th className="px-3 py-2">Admission no.</th><th className="px-3 py-2">Review</th></tr></thead><tbody>{review.rows.map((row: any) => <tr key={row.sourceRow} className="border-t border-[#edf1ec]"><td className="px-3 py-2 text-[#758078]">{row.sourceRow}</td><td className="px-3 py-2 font-semibold text-[#3d5147]">{row.firstName} {row.lastName}</td><td className="px-3 py-2 font-mono text-[10px] text-[#64766d]">{row.admissionNo || "—"}</td><td className="px-3 py-2">{row.errors?.length ? <span className="text-[#a3463d]">{row.errors.join(" ")}</span> : <span className="text-[#25714b]">Ready</span>}</td></tr>)}</tbody></table></div>
        {!review.errorCount && <div className="mt-4 rounded-lg border border-[#e5d3aa] bg-[#fffaf0] p-3"><label className="flex gap-2 text-[11px] leading-5 text-[#6e592d]"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#0f5c4f]" />I confirm these are school-approved records. I understand NSOS will create the reviewed student and linked guardian records in the selected class and session.</label><button type="button" disabled={!confirmed || importRows.isPending} onClick={() => importRows.mutate({ schoolId, classId: Number(classId), sessionId: Number(sessionId), admittedOn, idempotencyKey, rows: reviewedRows, confirmed: true })} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#8a5a12] px-3.5 py-2 text-xs font-bold text-white disabled:opacity-50">{importRows.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}{importRows.isPending ? "Importing approved records…" : "Confirm and import records"}</button></div>}
      </div>}

      <div className="border-t border-[#e2ede5] pt-4"><p className="text-[11px] font-bold text-[#41584b]">Recent migration batches</p>{history.isLoading ? <p className="mt-1 text-[11px] text-[#78877f]">Loading batch history…</p> : history.data?.length ? <div className="mt-2 flex flex-wrap gap-2">{history.data.slice(0, 6).map(batch => <span key={batch.id} className="rounded-full border border-[#d8e6db] bg-white px-2.5 py-1 text-[10px] text-[#607269]">Batch #{batch.id} · {batch.studentCount} students · {batch.guardianCount} guardians</span>)}</div> : <p className="mt-1 text-[11px] text-[#78877f]">No student migration batches have been completed in this school.</p>}</div>
    </div>
  </section>;
}

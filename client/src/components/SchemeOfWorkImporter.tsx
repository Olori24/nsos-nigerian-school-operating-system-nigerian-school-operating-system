import { trpc } from "@/lib/trpc";
import { AlertTriangle, FileSpreadsheet, LockKeyhole, MessageSquareText, Replace, Upload, X } from "lucide-react";
import { ExpiredSchemeRecommendationReport, LeaderSchemeRevisionPriorityControls } from "@/components/SchemeRevisionPriorityControls";
import { ChangeEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

type ReviewedRow = { weekNo: number; topic: string; objectives?: string; resources?: string };

const inputClass = "h-10 w-full rounded-lg border border-[#dfe5df] bg-[#fbfcfa] px-3 text-sm text-[#15201c] outline-none transition focus:border-[#0f5c4f] focus:ring-2 focus:ring-[#0f5c4f]/10";
const maxBytes = 2 * 1024 * 1024;

function cleanHeader(value: string) { return value.toLowerCase().replace(/[^a-z0-9]/g, ""); }

async function asBase64(file: File) {
  const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onerror = () => reject(new Error("The scheme file could not be read.")); reader.onload = () => resolve(String(reader.result)); reader.readAsDataURL(file); });
  return dataUrl.split(",")[1] ?? "";
}

async function parseSchemeFile(file: File) {
  if (file.size > maxBytes) throw new Error("Upload a CSV or Excel scheme file no larger than 2 MB.");
  if (!/\.(csv|xlsx)$/i.test(file.name)) throw new Error("Upload a CSV or Excel (.xlsx) scheme-of-work file.");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: false });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!worksheet) throw new Error("The workbook does not contain a readable first worksheet.");
  const sourceRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "", raw: false });
  if (!sourceRows.length) throw new Error("The selected worksheet does not contain any rows.");
  const rows = sourceRows.map((source, index) => {
    const values = Object.fromEntries(Object.entries(source).map(([key, value]) => [cleanHeader(key), String(value ?? "").trim()]));
    const weekValue = values.week ?? values.weekno ?? values.weeknumber;
    const topic = values.topic ?? values.title;
    const objectives = values.objectives ?? values.objective ?? "";
    const resources = values.resources ?? values.resource ?? "";
    const weekNo = Number(weekValue);
    if (!Number.isInteger(weekNo) || weekNo < 1 || weekNo > 20) throw new Error(`Row ${index + 2} needs a Week value from 1 to 20.`);
    if (!topic || topic.length > 255) throw new Error(`Row ${index + 2} needs a Topic no longer than 255 characters.`);
    return { weekNo, topic, objectives: objectives || undefined, resources: resources || undefined };
  });
  if (rows.length > 60) throw new Error("Import up to 60 scheme rows at a time.");
  const duplicateWeek = rows.find((row, index) => rows.findIndex(candidate => candidate.weekNo === row.weekNo) !== index);
  if (duplicateWeek) throw new Error(`Week ${duplicateWeek.weekNo} appears more than once. Review the source file before importing.`);
  return rows.sort((left, right) => left.weekNo - right.weekNo);
}

export function SchemeOfWorkImporter({ schoolId, academic, staff, canConfigure, onDone }: { schoolId: number; academic: any; staff: any[]; canConfigure: boolean; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ReviewedRow[]>([]);
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [termId, setTermId] = useState("");
  const [assignedTeacherId, setAssignedTeacherId] = useState("");
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [feedbackImportId, setFeedbackImportId] = useState<number | null>(null);
  const classSubjects = useMemo(() => (academic?.classSubjects ?? []).filter((item: any) => String(item.classId) === classId), [academic?.classSubjects, classId]);
  const subjectOptions = useMemo(() => (academic?.subjects ?? []).filter((subject: any) => classSubjects.some((assignment: any) => Number(assignment.subjectId) === Number(subject.id))), [academic?.subjects, classSubjects]);
  const selectedClassSubject = useMemo(() => classSubjects.find((assignment: any) => String(assignment.subjectId) === subjectId), [classSubjects, subjectId]);
  const currentTargetAlreadyImported = useMemo(() => (academic?.schemeImports ?? []).some((item: any) => String(item.classId) === classId && String(item.subjectId) === subjectId && String(item.termId) === termId), [academic?.schemeImports, classId, subjectId, termId]);
  const importScheme = trpc.nsos.academics.importSchemeOfWork.useMutation({ onSuccess: result => { toast.success(`${result.rowCount} approved scheme rows imported into the curriculum.`); setFile(null); setRows([]); setReplaceExisting(false); onDone(); }, onError: error => toast.error(error.message) });
  const assignTeacher = trpc.nsos.academics.assignClassSubject.useMutation({ onSuccess: () => { toast.success("Assigned teacher saved. Their review is now required before publication."); setAssignedTeacherId(""); onDone(); }, onError: error => toast.error(error.message) });
  const publishImport = trpc.nsos.academics.publishApprovedSchemeImport.useMutation({ onSuccess: result => { toast.success(`${result.rowCount} teacher-approved weekly plan${result.rowCount === 1 ? "" : "s"} published for classroom use.`); onDone(); }, onError: error => toast.error(error.message) });
  const feedback = trpc.nsos.academics.schemeImportInlineComments.useQuery({ schoolId, importId: feedbackImportId ?? 0 }, { enabled: feedbackImportId !== null });
  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0];
    if (!nextFile) return;
    setParsing(true);
    try { setRows(await parseSchemeFile(nextFile)); setFile(nextFile); toast.success("Scheme parsed locally. Review the mapped weeks and topics before importing."); }
    catch (error) { setFile(null); setRows([]); toast.error(error instanceof Error ? error.message : "The scheme file could not be parsed."); }
    finally { setParsing(false); event.target.value = ""; }
  };
  const submit = async () => {
    if (!file || !rows.length || !classId || !subjectId || !termId) return;
    try { importScheme.mutate({ schoolId, classId: Number(classId), subjectId: Number(subjectId), termId: Number(termId), fileName: file.name, mimeType: /\.csv$/i.test(file.name) ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", base64: await asBase64(file), rows, replaceExisting }); }
    catch (error) { toast.error(error instanceof Error ? error.message : "The scheme file could not be prepared for import."); }
  };
  return <section className="rounded-[1.2rem] border border-[#d8e5da] bg-white p-5 shadow-[0_10px_32px_rgba(16,45,35,0.035)] sm:p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eaf2ec] text-[#0f5c4f]"><FileSpreadsheet className="h-5 w-5" /></span><div><p className="text-sm font-semibold text-[#294238]">Approved scheme-of-work import</p><p className="mt-1 max-w-2xl text-xs leading-5 text-[#64766b]">Upload a school-approved CSV or Excel file, review its weeks and topics locally, then map it to an existing class, subject, and term. Importing never publishes lessons or alters results.</p></div></div></div>
    {!canConfigure ? <div className="mt-5 flex gap-3 rounded-xl border border-[#e8e0c8] bg-[#fffaf0] p-4 text-xs leading-5 text-[#735d2f]"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />Only the school owner or an administrator can import or replace an approved scheme of work.</div> : <div className="mt-5 grid gap-4"><div className="grid gap-3 md:grid-cols-3"><label className="grid gap-1.5 text-xs font-semibold text-[#43534c]"><span>Class</span><select className={inputClass} value={classId} onChange={event => { setClassId(event.target.value); setSubjectId(""); }}><option value="">Select class</option>{academic?.classes?.map((item: any) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label className="grid gap-1.5 text-xs font-semibold text-[#43534c]"><span>Approved subject</span><select disabled={!classId} className={inputClass} value={subjectId} onChange={event => setSubjectId(event.target.value)}><option value="">Select subject</option>{subjectOptions.map((item: any) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label className="grid gap-1.5 text-xs font-semibold text-[#43534c]"><span>Term</span><select className={inputClass} value={termId} onChange={event => setTermId(event.target.value)}><option value="">Select term</option>{academic?.terms?.map((item: any) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label></div>{classId && subjectId && <div className="rounded-xl border border-[#dce7de] bg-[#f8fcf8] p-4"><p className="text-xs font-semibold text-[#315046]">Assigned reviewing teacher</p>{selectedClassSubject?.teacherId ? <p className="mt-1 text-xs leading-5 text-[#607168]">A teacher is assigned to this class-subject. Every imported week will remain pending until that teacher approves it.</p> : <><p className="mt-1 text-xs leading-5 text-[#735d2f]">Assign an active staff teacher before this scheme can be imported for review.</p><div className="mt-3 flex flex-col gap-2 sm:flex-row"><select className={inputClass} value={assignedTeacherId} onChange={event => setAssignedTeacherId(event.target.value)}><option value="">Select active teacher</option>{staff.filter(item => item.employmentStatus === "active").map(item => <option key={item.id} value={item.id}>{item.firstName} {item.lastName}</option>)}</select><button disabled={!assignedTeacherId || assignTeacher.isPending} onClick={() => assignTeacher.mutate({ schoolId, classId: Number(classId), subjectId: Number(subjectId), teacherId: Number(assignedTeacherId) })} className="rounded-xl border border-[#cde0d0] bg-white px-4 py-2 text-xs font-bold text-[#176145] disabled:opacity-50">{assignTeacher.isPending ? "Assigning…" : "Assign reviewer"}</button></div></>}</div>}<div className="rounded-xl border border-dashed border-[#cbdccc] bg-[#f9fcf9] p-4"><label className="flex cursor-pointer flex-col items-center justify-center gap-2 text-center"><Upload className="h-5 w-5 text-[#0f5c4f]" /><span className="text-sm font-bold text-[#294238]">Choose approved CSV or Excel file</span><span className="text-xs text-[#687970]">Required columns: <strong>Week</strong> and <strong>Topic</strong>. Optional: Objectives, Resources. Maximum 2 MB.</span><input disabled={parsing || !selectedClassSubject?.teacherId} onChange={onFileChange} accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" type="file" className="sr-only" /></label></div>{file && <div className="rounded-xl border border-[#d9e7db] bg-[#f8fcf8] p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-[#2f493d]">Ready for review: {file.name}</p><p className="mt-1 text-[11px] text-[#64766b]">{rows.length} unique week{rows.length === 1 ? "" : "s"} parsed locally. The original approved document will be retained securely after import.</p></div><button onClick={() => { setFile(null); setRows([]); }} className="rounded-lg p-1.5 text-[#6e7d75] hover:bg-white" aria-label="Remove selected scheme file"><X className="h-4 w-4" /></button></div><div className="mt-3 max-h-48 overflow-y-auto rounded-lg border border-[#e5ece6] bg-white"><table className="w-full text-left text-xs"><thead className="sticky top-0 bg-[#f4f8f4] text-[10px] uppercase tracking-[0.1em] text-[#738177]"><tr><th className="px-3 py-2">Week</th><th className="px-3 py-2">Topic</th><th className="px-3 py-2">Objectives</th></tr></thead><tbody>{rows.map(row => <tr key={row.weekNo} className="border-t border-[#edf1ed]"><td className="px-3 py-2 font-bold text-[#285143]">{row.weekNo}</td><td className="px-3 py-2 text-[#31483d]">{row.topic}</td><td className="px-3 py-2 text-[#6a7971]">{row.objectives || "—"}</td></tr>)}</tbody></table></div></div>}{currentTargetAlreadyImported && <label className="flex gap-2 rounded-xl border border-[#ead4b2] bg-[#fffaf0] p-3 text-xs leading-5 text-[#735824]"><input checked={replaceExisting} onChange={event => setReplaceExisting(event.target.checked)} type="checkbox" className="mt-0.5 h-4 w-4 accent-[#8a5a12]" /><span><strong>Replace the current approved scheme for this class, subject, and term.</strong> Existing imported curriculum milestones for this same mapping will be replaced; manual lesson plans and results are not changed.</span></label>}<button disabled={!file || !rows.length || !classId || !subjectId || !termId || !selectedClassSubject?.teacherId || importScheme.isPending || (currentTargetAlreadyImported && !replaceExisting)} onClick={submit} className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#0f5c4f] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"><Replace className="h-4 w-4" />{importScheme.isPending ? "Importing for teacher review…" : "Import for teacher review"}</button></div>}
    {academic?.schemeImports?.length ? <div className="mt-6 border-t border-[#edf0eb] pt-4"><p className="text-xs font-semibold text-[#40564b]">Recent scheme imports</p><div className="mt-2 grid gap-2">{academic.schemeImports.slice(0, 4).map((item: any) => { const summary = item.reviewSummary ?? {}; const readyToPublish = summary.pending === 0 && summary.returned === 0 && summary.approved > 0; const showingFeedback = feedbackImportId === item.id; return <div key={item.id} className="rounded-lg bg-[#f8faf7] px-3 py-2 text-xs"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-semibold text-[#354f42]">{item.fileName}</p><p className="mt-1 text-[#6b7a72]">{summary.published ?? 0} published · {summary.approved ?? 0} approved · {summary.pending ?? 0} pending · {summary.returned ?? 0} returned</p></div><div className="flex flex-wrap items-center gap-2"><span className="text-[#6b7a72]">{item.rowCount} rows</span><button type="button" onClick={() => setFeedbackImportId(showingFeedback ? null : item.id)} className="inline-flex items-center gap-1 rounded-lg border border-[#d5e3d7] bg-white px-2.5 py-1.5 text-xs font-bold text-[#2a664d]"><MessageSquareText className="h-3.5 w-3.5" />{showingFeedback ? "Hide feedback" : "View feedback"}</button>{readyToPublish && <button disabled={publishImport.isPending} onClick={() => publishImport.mutate({ schoolId, importId: item.id })} className="rounded-lg border border-[#cde0d0] bg-white px-3 py-1.5 text-xs font-bold text-[#176145]">Publish approved plans</button>}</div></div>{showingFeedback && <div className="mt-3 border-t border-[#e3ece4] pt-3">{feedback.isLoading ? <p className="text-[11px] text-[#64766b]">Loading section feedback…</p> : feedback.data?.some((row: any) => row.comments?.length) ? <div className="grid gap-2">{feedback.data.map((row: any) => row.comments?.length ? <div key={row.rowId} className="rounded-lg border border-[#e5ece6] bg-white p-2.5"><p className="text-[11px] font-bold text-[#40564b]">Week {row.weekNo}: {row.topic}</p><div className="mt-2 grid gap-1.5">{row.comments.map((comment: any) => <p key={comment.id} className="rounded-md bg-[#fff9e9] px-2 py-1.5 text-[11px] leading-4 text-[#66511d]"><span className="font-bold capitalize">{comment.anchor}:</span> {comment.body}</p>)}</div></div> : null)}</div> : <p className="rounded-lg border border-dashed border-[#d6e1d7] bg-white p-3 text-[11px] leading-5 text-[#65766d]">No inline teacher comments have been added to this import.</p>}</div>}</div>; })}</div></div> : null}
    {canConfigure && <div className="mt-6 grid gap-6"><LeaderSchemeRevisionPriorityControls schoolId={schoolId} onDone={onDone} /><ExpiredSchemeRecommendationReport schoolId={schoolId} /></div>}
  </section>;
}

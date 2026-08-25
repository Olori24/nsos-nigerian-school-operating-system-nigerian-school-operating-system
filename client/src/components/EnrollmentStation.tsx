import { trpc } from "@/lib/trpc";
import { exportStudentRecordPdf } from "@/lib/studentRecordPdf";
import { BadgeCheck, BookOpenCheck, CheckCircle2, Download, Loader2, ShieldCheck, UserRound } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const inputClass = "h-10 w-full rounded-lg border border-[#dfe5df] bg-[#fbfcfa] px-3 text-sm text-[#15201c] outline-none transition focus:border-[#0f5c4f] focus:ring-2 focus:ring-[#0f5c4f]/10";

function RecordViewSkeleton({ recordView }: { recordView: "profile" | "enrollment" }) {
  const labels = recordView === "profile" ? ["Student identity", "Admission number", "Student status", "Primary guardian"] : ["Enrollment ID", "Class", "Session", "Enrollment status", "Enrolled on"];
  return <div role="status" aria-live="polite" aria-busy="true" className="grid gap-2 rounded-xl border border-[#dce8df] bg-[#f8fbf8] p-3"><span className="sr-only">Loading the protected {recordView === "profile" ? "student profile" : "enrollment record"}.</span>{labels.map((label, index) => <div key={label} className="flex items-center justify-between gap-4"><span className="h-3 w-24 rounded bg-[#dfe9e1] animate-pulse motion-reduce:animate-none" /><span className={`h-3 rounded bg-[#dfe9e1] animate-pulse motion-reduce:animate-none ${index % 2 ? "w-28" : "w-40"}`} /></div>)}</div>;
}

function ResolvedRecordDetail({ recordView, record, enrollmentId }: { recordView: "profile" | "enrollment"; record: any; enrollmentId: number }) {
  const viewedEnrollment = record.enrollments.find((item: any) => item.id === enrollmentId);
  return <div key={recordView} className="record-detail-fade-in grid gap-2 rounded-xl border border-[#dce8df] bg-[#f8fbf8] p-3 text-xs text-[#40574b]">{recordView === "profile" ? <><p><strong>Student:</strong> {record.student.firstName} {record.student.middleName ? `${record.student.middleName} ` : ""}{record.student.lastName}</p><p><strong>Admission number:</strong> {record.student.admissionNo}</p><p><strong>Status:</strong> {record.student.status}</p><p><strong>Primary guardian:</strong> {record.guardians.find((item: any) => item.isPrimary)?.firstName ?? "Not linked"} {record.guardians.find((item: any) => item.isPrimary)?.lastName ?? ""}</p></> : <><p><strong>Enrollment ID:</strong> {viewedEnrollment?.id ?? enrollmentId}</p><p><strong>Class:</strong> {viewedEnrollment?.className ?? "Unavailable"}</p><p><strong>Session:</strong> {viewedEnrollment?.sessionName ?? "Unavailable"}</p><p><strong>Status:</strong> {viewedEnrollment?.status ?? "Unavailable"}</p><p><strong>Enrolled on:</strong> {viewedEnrollment?.enrolledOn ? new Date(viewedEnrollment.enrolledOn).toLocaleDateString() : "Unavailable"}</p></>}</div>;
}

export function EnrollmentStation({ schoolId, applications, academic, onDone }: { schoolId: number; applications: any[]; academic: any; onDone: () => void }) {
  const [applicationId, setApplicationId] = useState("");
  const [classId, setClassId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [admissionNo, setAdmissionNo] = useState("");
  const [admittedOn, setAdmittedOn] = useState(new Date().toISOString().slice(0, 10));
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [completedEnrollment, setCompletedEnrollment] = useState<{ studentId: number; enrollmentId: number; studentName: string; admissionNo: string } | null>(null);
  const [recordView, setRecordView] = useState<"profile" | "enrollment">("profile");
  const [isExporting, setIsExporting] = useState(false);
  const selectedApplicant = applications.find(item => String(item.id) === applicationId);
  const selectedClass = (academic?.classes ?? []).find((item: any) => String(item.id) === classId);
  const selectedSession = (academic?.sessions ?? []).find((item: any) => String(item.id) === sessionId);
  const completedRecord = trpc.nsos.students.record.useQuery({ schoolId, studentId: completedEnrollment?.studentId ?? 1 }, { enabled: Boolean(completedEnrollment) });
  const enroll = trpc.nsos.admissions.enrol.useMutation({
    onSuccess: result => {
      const guardianMessage = result.guardianCreated ? "A new guardian record was created and linked." : "The submitted guardian record was linked.";
      const message = result.letterDelivery === "sent" ? `Enrollment confirmed. Biodata was transferred, ${guardianMessage.toLowerCase()} The admission letter was emailed to the recorded guardian.` : result.letterDelivery === "not_sent_no_guardian_email" ? `Enrollment confirmed and biodata transferred. ${guardianMessage} No guardian email was provided, so no admission letter was sent.` : `Enrollment confirmed and biodata transferred. ${guardianMessage} The admission letter could not be delivered; check the communication log and resend after correcting the email setup.`;
      result.letterDelivery === "failed" ? toast.warning(message) : toast.success(message);
      setConfirmOpen(false);
      setRecordView("profile");
      setCompletedEnrollment({ studentId: result.studentId, enrollmentId: result.enrollmentId, studentName: result.studentName, admissionNo: result.admissionNo });
      setApplicationId("");
      setAdmissionNo("");
      onDone();
    },
    onError: error => { setConfirmOpen(false); toast.error(error.message); },
  });
  const accepted = applications.filter(item => item.status === "accepted");
  const formReady = Boolean(selectedApplicant && selectedClass && selectedSession && admissionNo.trim().length >= 2 && admittedOn);
  const beginEnrollment = (event: FormEvent) => { event.preventDefault(); if (formReady) setConfirmOpen(true); };
  const confirmEnrollment = () => { if (!formReady) return; enroll.mutate({ schoolId, applicationId: Number(applicationId), classId: Number(classId), sessionId: Number(sessionId), admissionNo: admissionNo.trim(), admittedOn, confirmed: true }); };
  const exportPdf = async () => {
    if (!completedRecord.data || !completedEnrollment) return;
    const enrollment = completedRecord.data.enrollments.find(item => item.id === completedEnrollment.enrollmentId);
    if (!enrollment) { toast.error("NSOS could not find the new enrollment record for export."); return; }
    setIsExporting(true);
    try {
      await exportStudentRecordPdf({ student: completedRecord.data.student, guardians: completedRecord.data.guardians, enrollment });
      toast.success("Student profile and enrollment record PDF downloaded.");
    } catch { toast.error("NSOS could not create the protected record PDF. Please try again."); }
    finally { setIsExporting(false); }
  };
  const canExport = Boolean(completedRecord.data && completedEnrollment && !completedRecord.error && !completedRecord.isLoading && !isExporting);

  return <section className="rounded-[1.2rem] border border-[#e0e5df] bg-white p-5 shadow-[0_10px_32px_rgba(16,45,35,0.035)] sm:p-6">
    <div className="flex items-start gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e2f1e8] text-[#176145]"><BadgeCheck className="h-4 w-4" /></span><div><p className="text-sm font-semibold text-[#2d4439]">Accepted applicant to enrolled learner</p><p className="mt-1 text-xs leading-5 text-[#758079]">Choose an accepted applicant, first class, session, admission number, and admission date. Enrollment remains a separate final approval; payment and provider evidence are reviewed elsewhere.</p></div></div>
    <div className="mt-4 grid gap-2 rounded-xl border border-[#dce9df] bg-[#f7fcf8] p-3 text-[10px] leading-4 text-[#567266] sm:grid-cols-3"><p className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-[#176145]" />Acceptance makes an applicant eligible for review.</p><p className="flex gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-[#176145]" />Final confirmation creates the learner and guardian link.</p><p className="flex gap-2"><BadgeCheck className="h-4 w-4 shrink-0 text-[#176145]" />Letter delivery is tracked separately after enrollment.</p></div>
    <form onSubmit={beginEnrollment} className="mt-5 grid gap-3 sm:grid-cols-5"><label className="grid gap-1.5 text-xs font-semibold text-[#43534c]"><span>Accepted applicant</span><select required className={inputClass} value={applicationId} onChange={event => setApplicationId(event.target.value)}><option value="">Select applicant</option>{accepted.map(item => <option key={item.id} value={item.id}>{item.applicationNo} · {item.firstName} {item.lastName}</option>)}</select></label><label className="grid gap-1.5 text-xs font-semibold text-[#43534c]"><span>Admission number</span><input required className={inputClass} value={admissionNo} onChange={event => setAdmissionNo(event.target.value.toUpperCase())} placeholder="NSOS/2026/001" /></label><label className="grid gap-1.5 text-xs font-semibold text-[#43534c]"><span>First class</span><select required className={inputClass} value={classId} onChange={event => setClassId(event.target.value)}><option value="">Select class</option>{(academic?.classes ?? []).map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="grid gap-1.5 text-xs font-semibold text-[#43534c]"><span>Session</span><select required className={inputClass} value={sessionId} onChange={event => setSessionId(event.target.value)}><option value="">Select session</option>{(academic?.sessions ?? []).map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="grid gap-1.5 text-xs font-semibold text-[#43534c]"><span>Admission date</span><input required type="date" className={inputClass} value={admittedOn} onChange={event => setAdmittedOn(event.target.value)} /></label><button disabled={!formReady || enroll.isPending} className="sm:col-span-5 inline-flex w-fit items-center gap-2 rounded-xl bg-[#0f5c4f] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{enroll.isPending ? <><Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />Creating learner record…</> : "Review enrollment details"}</button></form>
    {!accepted.length ? <p className="mt-3 text-xs text-[#758079]">Accepted applications will be ready to enrol here. Accepting an applicant does not create a learner automatically.</p> : <p className="mt-3 text-xs leading-5 text-[#758079]">Only accepted applicants are eligible. Payment evidence, invoices, and any provider status remain separate finance review; they do not bypass this final enrollment confirmation.</p>}
    <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Final enrollment confirmation</AlertDialogTitle><AlertDialogDescription>Confirm the student onboarding details below. This creates the learner profile, links the guardian, and records the first enrollment. It does not collect or record payment. An admission letter is attempted only after enrollment and only when a guardian email exists.</AlertDialogDescription></AlertDialogHeader><div className="grid gap-2 rounded-xl border border-[#dce8df] bg-[#f8fbf8] p-3 text-xs text-[#40574b]"><p><strong>Applicant:</strong> {selectedApplicant ? `${selectedApplicant.applicationNo} · ${selectedApplicant.firstName} ${selectedApplicant.lastName}` : "Not selected"}</p><p><strong>First class:</strong> {selectedClass?.name ?? "Not selected"}</p><p><strong>Session:</strong> {selectedSession?.name ?? "Not selected"}</p><p><strong>Admission number:</strong> {admissionNo || "Not provided"}</p><p><strong>Admission date:</strong> {admittedOn}</p></div><AlertDialogFooter><AlertDialogCancel disabled={enroll.isPending}>Go back</AlertDialogCancel><AlertDialogAction disabled={!formReady || enroll.isPending} onClick={confirmEnrollment}>{enroll.isPending ? "Creating learner…" : "Confirm enrollment"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <Dialog open={Boolean(completedEnrollment)} onOpenChange={open => { if (!open) setCompletedEnrollment(null); }}><DialogContent><DialogHeader><DialogTitle>Enrollment complete</DialogTitle><DialogDescription>{completedEnrollment ? `${completedEnrollment.studentName} now has a tenant-scoped student profile and first enrollment record. Review either record below; opening this dialog does not change the learner, payment, or letter delivery state.` : ""}</DialogDescription></DialogHeader><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setRecordView("profile")} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold ${recordView === "profile" ? "bg-[#0f5c4f] text-white" : "border border-[#dce7df] bg-white text-[#315243]"}`}><UserRound className="h-3.5 w-3.5" />View student profile</button><button type="button" onClick={() => setRecordView("enrollment")} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold ${recordView === "enrollment" ? "bg-[#0f5c4f] text-white" : "border border-[#dce7df] bg-white text-[#315243]"}`}><BookOpenCheck className="h-3.5 w-3.5" />View enrollment record</button><button type="button" onClick={exportPdf} disabled={!canExport} aria-label="Download student profile and enrollment record as PDF" className="inline-flex items-center gap-2 rounded-lg border border-[#cfe0d4] bg-[#f5faf6] px-3 py-2 text-xs font-bold text-[#176145] transition hover:bg-[#e9f4ec] disabled:cursor-not-allowed disabled:opacity-50"><Download className="h-3.5 w-3.5" />{isExporting ? "Preparing PDF…" : "Download PDF"}</button></div>{completedRecord.isLoading ? <RecordViewSkeleton recordView={recordView} /> : completedRecord.error || !completedRecord.data ? <div role="alert" className="rounded-xl border border-[#ead6cd] bg-[#fff8f5] p-3 text-xs leading-5 text-[#884b42]">The enrollment succeeded, but NSOS could not load its record view. Close this dialog and open Students to retry; no enrollment was reversed.</div> : <ResolvedRecordDetail recordView={recordView} record={completedRecord.data} enrollmentId={completedEnrollment?.enrollmentId ?? 0} />}</DialogContent></Dialog>
  </section>;
}

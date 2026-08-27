import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { exportStudentRecordPdf } from "@/lib/studentRecordPdf";
import { BadgeCheck, BookOpenCheck, CheckCircle2, Download, Loader2, Mail, ShieldCheck, UserRound } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

const inputClass = "h-10 w-full rounded-lg border border-[#dfe5df] bg-[#fbfcfa] px-3 text-sm text-[#15201c] outline-none transition focus:border-[#0f5c4f] focus:ring-2 focus:ring-[#0f5c4f]/10";

function RecordViewSkeleton({ recordView }: { recordView: "profile" | "enrollment" }) {
  const labels = recordView === "profile" ? ["Student identity", "Admission number", "Student status", "Primary guardian"] : ["Enrollment ID", "Class", "Session", "Enrollment status", "Enrolled on"];

  return <div role="status" aria-live="polite" aria-busy="true" className="grid gap-2 rounded-xl border border-[#dce8df] bg-[#f8fbf8] p-3"><span className="sr-only">Loading the protected {recordView === "profile" ? "student profile" : "enrollment record"}.</span>{labels.map((label, index) => <div key={label} className="flex items-center justify-between gap-4"><span className="h-3 w-24 rounded bg-[#dfe9e1] animate-pulse motion-reduce:animate-none" /><span className={`h-3 rounded bg-[#dfe9e1] animate-pulse motion-reduce:animate-none ${index % 2 ? "w-28" : "w-40"}`} /></div>)}</div>;
}

function ResolvedRecordDetail({ recordView, record, enrollmentId }: { recordView: "profile" | "enrollment"; record: any; enrollmentId: number }) {
  const viewedEnrollment = record.enrollments.find((item: any) => item.id === enrollmentId);

  if (recordView === "profile") {
    const primaryGuardian = record.guardians.find((item: any) => item.isPrimary);
    return <dl key={recordView} className="record-detail-fade-in grid gap-3 rounded-xl border border-[#dce8df] bg-[#f8fbf8] p-4 text-sm text-[#40574b]"><div className="grid gap-1"><dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6d8276]">Student</dt><dd className="font-semibold text-[#264338]">{record.student.firstName} {record.student.middleName ? `${record.student.middleName} ` : ""}{record.student.lastName}</dd></div><div className="grid gap-1 sm:grid-cols-2"><div><dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6d8276]">Admission number</dt><dd className="mt-1 font-semibold text-[#264338]">{record.student.admissionNo}</dd></div><div><dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6d8276]">Student status</dt><dd className="mt-1 font-semibold capitalize text-[#264338]">{record.student.status}</dd></div></div><div className="grid gap-1"><dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6d8276]">Primary guardian</dt><dd className="font-semibold text-[#264338]">{primaryGuardian ? `${primaryGuardian.firstName} ${primaryGuardian.lastName}` : "Not linked"}</dd></div></dl>;
  }

  return <dl key={recordView} className="record-detail-fade-in grid gap-3 rounded-xl border border-[#dce8df] bg-[#f8fbf8] p-4 text-sm text-[#40574b]"><div className="grid gap-1 sm:grid-cols-2"><div><dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6d8276]">Enrollment ID</dt><dd className="mt-1 font-semibold text-[#264338]">{viewedEnrollment?.id ?? enrollmentId}</dd></div><div><dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6d8276]">Enrollment status</dt><dd className="mt-1 font-semibold capitalize text-[#264338]">{viewedEnrollment?.status ?? "Unavailable"}</dd></div></div><div className="grid gap-3 sm:grid-cols-2"><div><dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6d8276]">Class</dt><dd className="mt-1 font-semibold text-[#264338]">{viewedEnrollment?.className ?? "Unavailable"}</dd></div><div><dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6d8276]">Session</dt><dd className="mt-1 font-semibold text-[#264338]">{viewedEnrollment?.sessionName ?? "Unavailable"}</dd></div></div><div className="grid gap-1"><dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6d8276]">Recorded on</dt><dd className="mt-1 font-semibold text-[#264338]">{viewedEnrollment?.enrolledOn ? new Date(viewedEnrollment.enrolledOn).toLocaleDateString() : "Unavailable"}</dd></div></dl>;
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
  const [shareOpen, setShareOpen] = useState(false);
  const [selectedRecipientKey, setSelectedRecipientKey] = useState("");
  const [shareSubject, setShareSubject] = useState("");
  const [shareBody, setShareBody] = useState("");
  const selectedApplicant = applications.find(item => String(item.id) === applicationId);
  const selectedClass = (academic?.classes ?? []).find((item: any) => String(item.id) === classId);
  const selectedSession = (academic?.sessions ?? []).find((item: any) => String(item.id) === sessionId);
  const completedRecord = trpc.nsos.students.record.useQuery({ schoolId, studentId: completedEnrollment?.studentId ?? 1 }, { enabled: Boolean(completedEnrollment) });
  const emailReadiness = trpc.nsos.students.recordEmailReadiness.useQuery({ schoolId, studentId: completedEnrollment?.studentId ?? 1, enrollmentId: completedEnrollment?.enrollmentId ?? 1 }, { enabled: Boolean(completedEnrollment) });
  const shareRecord = trpc.nsos.students.shareRecordPdf.useMutation({
    onSuccess: result => {
      setShareOpen(false);
      toast.success(`Protected record email submitted to ${result.recipient.maskedEmail}. Delivery confirmation is provider-managed.`);
    },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    if (!shareOpen || !emailReadiness.data?.copy) return;
    setShareSubject(emailReadiness.data.copy.subject);
    setShareBody(emailReadiness.data.copy.body);
  }, [shareOpen, completedEnrollment?.studentId, completedEnrollment?.enrollmentId, emailReadiness.data?.copy?.subject, emailReadiness.data?.copy?.body]);

  const enroll = trpc.nsos.admissions.enrol.useMutation({
    onSuccess: result => {
      const guardianMessage = result.guardianCreated ? "A guardian record was created and linked." : "The submitted guardian record was linked.";
      const message = result.letterDelivery === "sent" ? `Enrollment recorded. ${guardianMessage} The admission letter was submitted to the recorded guardian email.` : result.letterDelivery === "not_sent_no_guardian_email" ? `Enrollment recorded. ${guardianMessage} No guardian email is on record, so an admission letter was not sent.` : `Enrollment recorded. ${guardianMessage} The admission letter could not be delivered; review the communication log after the email setup is corrected.`;
      result.letterDelivery === "failed" ? toast.warning(message) : toast.success(message);
      setConfirmOpen(false);
      setRecordView("profile");
      setSelectedRecipientKey("");
      setCompletedEnrollment({ studentId: result.studentId, enrollmentId: result.enrollmentId, studentName: result.studentName, admissionNo: result.admissionNo });
      setApplicationId("");
      setAdmissionNo("");
      onDone();
    },
    onError: error => {
      setConfirmOpen(false);
      toast.error(error.message);
    },
  });

  const accepted = applications.filter(item => item.status === "accepted");
  const formReady = Boolean(selectedApplicant && selectedClass && selectedSession && admissionNo.trim().length >= 2 && admittedOn);
  const beginEnrollment = (event: FormEvent) => {
    event.preventDefault();
    if (formReady) setConfirmOpen(true);
  };
  const confirmEnrollment = () => {
    if (!formReady) return;
    enroll.mutate({ schoolId, applicationId: Number(applicationId), classId: Number(classId), sessionId: Number(sessionId), admissionNo: admissionNo.trim(), admittedOn, confirmed: true });
  };
  const exportPdf = async () => {
    if (!completedRecord.data || !completedEnrollment) return;
    const enrollment = completedRecord.data.enrollments.find(item => item.id === completedEnrollment.enrollmentId);
    if (!enrollment) {
      toast.error("NSOS could not find the new enrollment record for export.");
      return;
    }
    setIsExporting(true);
    try {
      await exportStudentRecordPdf({ student: completedRecord.data.student, guardians: completedRecord.data.guardians, enrollment });
      toast.success("Student profile and enrollment record PDF downloaded.");
    } catch {
      toast.error("NSOS could not create the protected record PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const selectedRecipient = emailReadiness.data?.recipients.find(recipient => `${recipient.kind}:${recipient.guardianId ?? ""}` === selectedRecipientKey);
  const canExport = Boolean(completedRecord.data && completedEnrollment && !completedRecord.error && !completedRecord.isLoading && !isExporting);
  const canOpenShare = Boolean(canExport && emailReadiness.data?.sender.ready && emailReadiness.data.recipients.length);
  const canSubmitShare = Boolean(selectedRecipient && shareSubject.trim().length >= 3 && shareBody.trim().length >= 10 && emailReadiness.data?.sender.ready);
  const submitShare = () => {
    if (!completedEnrollment || !selectedRecipient || !canSubmitShare) return;
    shareRecord.mutate({ schoolId, studentId: completedEnrollment.studentId, enrollmentId: completedEnrollment.enrollmentId, recipientKind: selectedRecipient.kind, guardianId: selectedRecipient.guardianId, subject: shareSubject.trim(), body: shareBody.trim(), confirmed: true });
  };

  return <section className="rounded-[1.2rem] border border-[#e0e5df] bg-white p-5 shadow-[0_10px_32px_rgba(16,45,35,0.035)] sm:p-6">
    <div className="flex items-start gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e2f1e8] text-[#176145]"><BadgeCheck className="h-4 w-4" /></span><div><p className="text-sm font-semibold text-[#2d4439]">Enroll an accepted applicant</p><p className="mt-1 text-xs leading-5 text-[#758079]">Select the accepted applicant, first class, session, admission number, and date. Review the details before the separate final enrollment confirmation.</p></div></div>
    <div className="mt-4 grid gap-2 rounded-xl border border-[#dce9df] bg-[#f7fcf8] p-3 text-[10px] leading-4 text-[#567266] sm:grid-cols-3"><p className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-[#176145]" />Acceptance makes an applicant eligible for enrollment review.</p><p className="flex gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-[#176145]" />Final confirmation creates the learner and guardian link.</p><p className="flex gap-2"><BadgeCheck className="h-4 w-4 shrink-0 text-[#176145]" />Letter delivery is recorded separately after enrollment.</p></div>
    <form onSubmit={beginEnrollment} className="mt-5 grid gap-3 sm:grid-cols-5"><label className="grid gap-1.5 text-xs font-semibold text-[#43534c]"><span>Accepted applicant</span><select required className={inputClass} value={applicationId} onChange={event => setApplicationId(event.target.value)}><option value="">Select applicant</option>{accepted.map(item => <option key={item.id} value={item.id}>{item.applicationNo} · {item.firstName} {item.lastName}</option>)}</select></label><label className="grid gap-1.5 text-xs font-semibold text-[#43534c]"><span>Admission number</span><input required className={inputClass} value={admissionNo} onChange={event => setAdmissionNo(event.target.value.toUpperCase())} placeholder="NSOS/2026/001" /></label><label className="grid gap-1.5 text-xs font-semibold text-[#43534c]"><span>First class</span><select required className={inputClass} value={classId} onChange={event => setClassId(event.target.value)}><option value="">Select class</option>{(academic?.classes ?? []).map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="grid gap-1.5 text-xs font-semibold text-[#43534c]"><span>Session</span><select required className={inputClass} value={sessionId} onChange={event => setSessionId(event.target.value)}><option value="">Select session</option>{(academic?.sessions ?? []).map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="grid gap-1.5 text-xs font-semibold text-[#43534c]"><span>Admission date</span><input required type="date" className={inputClass} value={admittedOn} onChange={event => setAdmittedOn(event.target.value)} /></label><button disabled={!formReady || enroll.isPending} className="sm:col-span-5 inline-flex w-fit items-center gap-2 rounded-xl bg-[#0f5c4f] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{enroll.isPending ? <><Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />Creating learner record…</> : "Review enrollment"}</button></form>
    {!accepted.length ? <p className="mt-3 text-xs text-[#758079]">Accepted applications will appear here after acceptance. Acceptance alone does not create a learner record.</p> : <p className="mt-3 text-xs leading-5 text-[#758079]">Only accepted applicants can be enrolled. Payment evidence, invoices, and provider status remain separate finance review and do not bypass this confirmation.</p>}
    <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirm enrollment details</AlertDialogTitle><AlertDialogDescription>Confirm the learner details below. This creates the learner profile, links the guardian, and records the first enrollment. It does not collect or record payment. An admission letter is attempted only after enrollment and only when a guardian email exists.</AlertDialogDescription></AlertDialogHeader><div className="grid gap-2 rounded-xl border border-[#dce8df] bg-[#f8fbf8] p-3 text-xs text-[#40574b]"><p><strong>Applicant:</strong> {selectedApplicant ? `${selectedApplicant.applicationNo} · ${selectedApplicant.firstName} ${selectedApplicant.lastName}` : "Not selected"}</p><p><strong>First class:</strong> {selectedClass?.name ?? "Not selected"}</p><p><strong>Session:</strong> {selectedSession?.name ?? "Not selected"}</p><p><strong>Admission number:</strong> {admissionNo || "Not provided"}</p><p><strong>Admission date:</strong> {admittedOn}</p></div><AlertDialogFooter><AlertDialogCancel disabled={enroll.isPending}>Go back</AlertDialogCancel><AlertDialogAction disabled={!formReady || enroll.isPending} onClick={confirmEnrollment}>{enroll.isPending ? "Creating learner…" : "Confirm and create record"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <Dialog open={Boolean(completedEnrollment)} onOpenChange={open => { if (!open) setCompletedEnrollment(null); }}><DialogContent className="enrollment-completion-dialog max-w-[calc(100%-1.5rem)] gap-0 p-0 sm:max-w-xl"><DialogHeader className="border-b border-[#dce8df] bg-[#fbfdfb] px-5 pb-4 pr-14 pt-5 text-left sm:px-6"><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#176145]"><BadgeCheck className="h-4 w-4" />Enrollment recorded</p><DialogTitle className="mt-2 text-xl tracking-[-0.02em] text-[#234238]">Learner record is ready to review</DialogTitle><DialogDescription className="mt-2 leading-6 text-[#5f7469]">{completedEnrollment ? `${completedEnrollment.studentName} now has a tenant-scoped learner profile and first enrollment record. Viewing this summary does not change payment, document delivery, or enrollment status.` : ""}</DialogDescription></DialogHeader><div className="grid gap-4 p-4 sm:p-5"><section aria-labelledby="completion-record-view-title"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 id="completion-record-view-title" className="text-sm font-bold text-[#29483c]">Review the confirmed record</h3><p className="mt-1 text-xs leading-5 text-[#718178]">Choose the record view before downloading or sharing a protected PDF.</p></div></div><div role="group" aria-label="Confirmed record view" className="mt-3 grid grid-cols-2 gap-2"><button type="button" aria-pressed={recordView === "profile"} onClick={() => setRecordView("profile")} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition active:scale-[.98] ${recordView === "profile" ? "bg-[#0f5c4f] text-white shadow-sm" : "border border-[#dce7df] bg-white text-[#315243] hover:border-[#9fc4ab]"}`}><UserRound className="h-3.5 w-3.5" />Student profile</button><button type="button" aria-pressed={recordView === "enrollment"} onClick={() => setRecordView("enrollment")} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition active:scale-[.98] ${recordView === "enrollment" ? "bg-[#0f5c4f] text-white shadow-sm" : "border border-[#dce7df] bg-white text-[#315243] hover:border-[#9fc4ab]"}`}><BookOpenCheck className="h-3.5 w-3.5" />Enrollment record</button></div></section><section aria-labelledby="completion-document-actions-title" className="rounded-xl border border-[#dce8df] bg-[#f8fbf8] p-3"><h3 id="completion-document-actions-title" className="text-sm font-bold text-[#29483c]">Protected document actions</h3><p className="mt-1 text-xs leading-5 text-[#63796e]">Downloading stays on this device. Email sharing remains unavailable until the existing sender and registered-recipient checks pass.</p><div className="mt-3 grid gap-2 sm:grid-cols-2"><button type="button" onClick={exportPdf} disabled={!canExport} aria-label="Download student profile and enrollment record as PDF" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#cfe0d4] bg-white px-3 py-2 text-xs font-bold text-[#176145] transition hover:bg-[#e9f4ec] active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50"><Download className="h-3.5 w-3.5" />{isExporting ? "Preparing PDF…" : "Download record PDF"}</button><button type="button" onClick={() => setShareOpen(true)} disabled={!canOpenShare} aria-label="Share student profile and enrollment record via email" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#cfe0d4] bg-white px-3 py-2 text-xs font-bold text-[#176145] transition hover:bg-[#e9f4ec] active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50"><Mail className="h-3.5 w-3.5" />Email record PDF</button></div></section>{completedRecord.isLoading ? <RecordViewSkeleton recordView={recordView} /> : completedRecord.error || !completedRecord.data ? <div role="alert" className="rounded-xl border border-[#ead6cd] bg-[#fff8f5] p-3 text-xs leading-5 text-[#884b42]">Enrollment was recorded, but NSOS could not load this record view. Close this dialog and open Students to retry; no enrollment was reversed.</div> : <ResolvedRecordDetail recordView={recordView} record={completedRecord.data} enrollmentId={completedEnrollment?.enrollmentId ?? 0} />}{completedEnrollment ? <p aria-live="polite" className="rounded-lg bg-[#f4f8f4] px-3 py-2 text-[11px] leading-5 text-[#5d7568]">{emailReadiness.isLoading ? "Checking sender evidence before enabling email sharing…" : emailReadiness.data?.sender.message ?? "Email sharing becomes available only after sender evidence and a registered recipient email are confirmed."}</p> : null}</div></DialogContent></Dialog>
    <AlertDialog open={shareOpen} onOpenChange={setShareOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Send protected record PDF</AlertDialogTitle><AlertDialogDescription>Select one registered recipient, review the bounded subject and message, then make a separate final confirmation. NSOS will submit the student profile and exact enrollment record PDF only; it will not change enrollment, payment, or admission status.</AlertDialogDescription></AlertDialogHeader><label className="grid gap-1.5 text-xs font-semibold text-[#43534c]"><span>Registered recipient</span><select value={selectedRecipientKey} onChange={event => setSelectedRecipientKey(event.target.value)} className={inputClass}><option value="">Select a registered email</option>{emailReadiness.data?.recipients.map(recipient => <option key={`${recipient.kind}:${recipient.guardianId ?? ""}`} value={`${recipient.kind}:${recipient.guardianId ?? ""}`}>{recipient.label} · {recipient.maskedEmail}</option>)}</select></label><label className="grid gap-1.5 text-xs font-semibold text-[#43534c]"><span className="flex items-center justify-between gap-3"><span>Email subject</span><span className="font-normal text-[#758079]">{shareSubject.length}/180</span></span><input value={shareSubject} maxLength={180} onChange={event => setShareSubject(event.target.value.replace(/[\r\n]/g, ""))} className={inputClass} aria-describedby="record-email-copy-note" /></label><label className="grid gap-1.5 text-xs font-semibold text-[#43534c]"><span className="flex items-center justify-between gap-3"><span>Email message</span><span className="font-normal text-[#758079]">{shareBody.length}/3000</span></span><textarea value={shareBody} maxLength={3000} onChange={event => setShareBody(event.target.value)} className="min-h-28 w-full resize-y rounded-lg border border-[#dfe5df] bg-[#fbfcfa] px-3 py-2 text-sm text-[#15201c] outline-none transition focus:border-[#0f5c4f] focus:ring-2 focus:ring-[#0f5c4f]/10" /></label><p id="record-email-copy-note" className="rounded-xl border border-[#dce8df] bg-[#f8fbf8] p-3 text-xs leading-5 text-[#567266]">{selectedRecipient ? `The protected PDF will be submitted only to ${selectedRecipient.maskedEmail}. Only the selected registered recipient can receive it; delivery confirmation is managed by the configured email provider.` : "No email will be sent until you select a recipient, review the message, and confirm below."}</p><AlertDialogFooter><AlertDialogCancel disabled={shareRecord.isPending}>Cancel</AlertDialogCancel><AlertDialogAction disabled={!canSubmitShare || shareRecord.isPending} onClick={submitShare}>{shareRecord.isPending ? "Submitting email…" : "Confirm and send PDF"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section>;
}

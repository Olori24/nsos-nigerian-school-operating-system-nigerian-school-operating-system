import { trpc } from "@/lib/trpc";
import { BookOpenCheck, MailCheck, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";

type Learner = {
  id: number;
  firstName: string;
  lastName: string;
  admissionNo: string;
  status: string;
};

const inputClass =
  "h-10 w-full rounded-lg border border-[#dfe5df] bg-[#fbfcfa] px-3 text-sm text-[#15201c] outline-none transition focus:border-[#0f5c4f] focus:ring-2 focus:ring-[#0f5c4f]/10";

function formatCourseTime(value: string | null | undefined) {
  if (!value) return "Time not recorded";
  const [hour, minute = "00"] = value.split(":");
  const hourNumber = Number(hour);
  if (!Number.isFinite(hourNumber)) return value;
  const suffix = hourNumber >= 12 ? "PM" : "AM";
  const displayHour = hourNumber % 12 || 12;
  return `${displayHour}:${minute} ${suffix}`;
}

function formatCourseDay(value: string | null | undefined) {
  return value
    ? `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`
    : "Day not recorded";
}

export function CourseMaterialsParentEmailDraft({
  schoolId,
  learners,
}: {
  schoolId: number;
  learners: Learner[];
}) {
  const academic = trpc.nsos.academics.list.useQuery({ schoolId });
  const [studentId, setStudentId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [recipientKey, setRecipientKey] = useState("");
  const [finalReviewAcknowledged, setFinalReviewAcknowledged] = useState(false);
  const history = trpc.nsos.students.history.useQuery(
    { schoolId, studentId: Number(studentId) || 1 },
    { enabled: Boolean(studentId) }
  );

  const selectedEnrollment = useMemo(
    () =>
      history.data?.find(item => item.enrollment.status === "active") ??
      history.data?.[0],
    [history.data]
  );
  const eligibleSubjects = useMemo(() => {
    if (!academic.data || !selectedEnrollment) return [];
    const classId = selectedEnrollment.enrollment.classId;
    const assignedIds = new Set(
      academic.data.classSubjects
        .filter(item => item.classId === classId)
        .map(item => item.subjectId)
    );
    return academic.data.subjects.filter(item => assignedIds.has(item.id));
  }, [academic.data, selectedEnrollment]);
  const selectedSubject = eligibleSubjects.find(
    item => String(item.id) === subjectId
  );
  const emailReadiness = trpc.nsos.students.recordEmailReadiness.useQuery(
    {
      schoolId,
      studentId: Number(studentId) || 1,
      enrollmentId: selectedEnrollment?.enrollment.id ?? 1,
    },
    { enabled: Boolean(studentId && selectedEnrollment) }
  );
  const selectedRecipient = emailReadiness.data?.recipients.find(
    recipient =>
      `${recipient.kind}:${recipient.guardianId ?? ""}` === recipientKey
  );
  const timetable = useMemo(() => {
    if (!academic.data || !selectedSubject || !selectedEnrollment) return [];
    return academic.data.timetable.filter(
      item =>
        item.subjectId === selectedSubject.id &&
        item.classId === selectedEnrollment.enrollment.classId
    );
  }, [academic.data, selectedEnrollment, selectedSubject]);
  const timetableText = timetable.length
    ? timetable
        .map(
          item =>
            `${formatCourseDay(item.dayOfWeek)}: ${formatCourseTime(item.startsAt)}–${formatCourseTime(item.endsAt)} WAT`
        )
        .join("\n")
    : "No course timetable entry is currently available for this learner’s class.";
  const draft = useMemo(() => {
    const courseTitle = selectedSubject?.name ?? "selected course";
    return {
      subject: `${courseTitle}: materials and class schedule`,
      body: `Dear Parent/Guardian,\n\nYour child is enrolled for ${courseTitle}.\n\nThe school’s recorded class timetable is:\n${timetableText}\n\nPlease ensure that your child has a working laptop and charger, a reliable internet connection where required, a current web browser, a notebook and pen, and headphones or earphones where the learning environment is shared.\n\nThe tutor will guide learners through any course-specific software setup during the first session. Please do not purchase software or share device passwords in advance.\n\nIf a session must be missed, please contact the school through its authorised support channel so that the tutor can advise on appropriate catch-up work.\n\nKind regards,\nNSOS School Operations`,
    };
  }, [selectedSubject?.name, timetableText]);

  const changeStudent = (value: string) => {
    setStudentId(value);
    setSubjectId("");
    setRecipientKey("");
    setFinalReviewAcknowledged(false);
  };
  const changeSubject = (value: string) => {
    setSubjectId(value);
    setFinalReviewAcknowledged(false);
  };

  return (
    <section
      className="rounded-[1.2rem] border border-[#e0e5df] bg-white p-5 shadow-[0_10px_32px_rgba(16,45,35,.035)] sm:p-6"
      aria-labelledby="course-materials-email-title"
    >
      <div className="flex gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#edf3ed] text-[#176145]">
          <MailCheck className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <h2
            id="course-materials-email-title"
            className="text-sm font-bold text-[#2d4439]"
          >
            Parent materials email draft
          </h2>
          <p className="mt-1 text-xs leading-5 text-[#758079]">
            Prepare a private, review-first course message from real school
            records. This panel does not send, schedule, export, or store a
            message.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-xs font-semibold text-[#43534c]">
          <span>Enrolled learner</span>
          <select
            value={studentId}
            onChange={event => changeStudent(event.target.value)}
            className={inputClass}
          >
            <option value="">Select an active learner</option>
            {learners
              .filter(learner => learner.status === "active")
              .map(learner => (
                <option key={learner.id} value={learner.id}>
                  {learner.firstName} {learner.lastName} · {learner.admissionNo}
                </option>
              ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold text-[#43534c]">
          <span>Configured course</span>
          <select
            value={subjectId}
            onChange={event => changeSubject(event.target.value)}
            className={inputClass}
            disabled={!selectedEnrollment || history.isLoading}
          >
            <option value="">
              {history.isLoading
                ? "Loading learner courses…"
                : "Select a subject assigned to the learner’s class"}
            </option>
            {eligibleSubjects.map(subject => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
                {subject.code ? ` · ${subject.code}` : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      {studentId && !history.isLoading && !selectedEnrollment ? (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-[#ead6cd] bg-[#fff8f5] p-3 text-xs leading-5 text-[#884b42]"
        >
          This learner does not have a tenant-scoped enrollment record available
          for a course-materials review.
        </p>
      ) : null}
      {selectedEnrollment && !eligibleSubjects.length ? (
        <p
          role="status"
          className="mt-3 rounded-lg border border-[#e5d9b5] bg-[#fffaf0] p-3 text-xs leading-5 text-[#735b2e]"
        >
          No subject is currently assigned to this learner’s class. Review the
          academic setup before preparing a parent message.
        </p>
      ) : null}

      {selectedSubject ? (
        <div className="mt-4 grid gap-4 rounded-xl border border-[#dce8df] bg-[#f8fbf8] p-4">
          <div className="flex items-start gap-2 text-xs leading-5 text-[#567266]">
            <BookOpenCheck
              className="mt-0.5 h-4 w-4 shrink-0 text-[#176145]"
              aria-hidden="true"
            />
            <p>
              <strong className="text-[#315243]">Course record:</strong> only
              the selected subject and its timetable entries for the learner’s
              enrolled class are shown. Verify course dates and any materials
              supplied by the school before a future send review.
            </p>
          </div>
          <div className="rounded-lg border border-[#dce8df] bg-white p-3 text-xs text-[#40574b]">
            <p className="font-bold text-[#29483c]">Recorded timetable</p>
            <p className="mt-1 whitespace-pre-line leading-5 text-[#63796e]">
              {timetableText}
            </p>
          </div>
          <label className="grid gap-1 text-xs font-semibold text-[#43534c]">
            <span>Permitted recipient</span>
            <select
              value={recipientKey}
              onChange={event => {
                setRecipientKey(event.target.value);
                setFinalReviewAcknowledged(false);
              }}
              className={inputClass}
              disabled={!emailReadiness.data?.recipients.length}
            >
              <option value="">
                {emailReadiness.isLoading
                  ? "Checking permitted recipient choices…"
                  : "Select a registered parent or guardian email"}
              </option>
              {emailReadiness.data?.recipients
                .filter(recipient => recipient.kind === "guardian")
                .map(recipient => (
                  <option
                    key={`${recipient.kind}:${recipient.guardianId ?? ""}`}
                    value={`${recipient.kind}:${recipient.guardianId ?? ""}`}
                  >
                    {recipient.label} · {recipient.maskedEmail}
                  </option>
                ))}
            </select>
          </label>
          <div className="grid gap-3">
            <label className="grid gap-1 text-xs font-semibold text-[#43534c]">
              <span>Email subject</span>
              <input
                value={draft.subject}
                readOnly
                className={inputClass}
                aria-label="Draft email subject"
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-[#43534c]">
              <span>Email message</span>
              <textarea
                value={draft.body}
                readOnly
                className="min-h-72 w-full resize-y rounded-lg border border-[#dfe5df] bg-[#fbfcfa] px-3 py-2 text-sm text-[#15201c] outline-none"
                aria-label="Draft email message"
              />
            </label>
          </div>
          <div className="rounded-lg border border-[#dce8df] bg-white p-3 text-xs leading-5 text-[#567266]">
            {emailReadiness.isLoading
              ? "Checking sender health before enabling any future delivery review…"
              : (emailReadiness.data?.sender.message ??
                "A sender-health check is required before any delivery review can be considered.")}
            {selectedRecipient ? (
              <span className="mt-1 block">
                Only the selected permitted recipient,{" "}
                {selectedRecipient.maskedEmail}, could be reviewed for a future
                one-time delivery.
              </span>
            ) : null}
          </div>
          <label className="flex gap-2 text-xs leading-5 text-[#675326]">
            <input
              type="checkbox"
              checked={finalReviewAcknowledged}
              onChange={event =>
                setFinalReviewAcknowledged(event.target.checked)
              }
              disabled={
                !emailReadiness.data?.sender.ready || !selectedRecipient
              }
              className="mt-0.5 h-4 w-4 accent-[#0f5c4f]"
            />
            I have reviewed the selected course, materials, and permitted
            recipient. A future one-time delivery would still need a separate
            final confirmation.
          </label>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e5d9b5] bg-[#fffaf0] p-3">
            <div className="flex min-w-0 items-start gap-2 text-xs leading-5 text-[#735b2e]">
              <ShieldCheck
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              <p>
                No email will be sent from this draft. Delivery remains
                unavailable while sender health is unresolved; no schedule,
                recipient record, message log, invitation, or contact export is
                created.
              </p>
            </div>
            <button
              type="button"
              disabled
              className="shrink-0 rounded-lg bg-[#0f5c4f] px-3 py-2 text-xs font-bold text-white opacity-55"
            >
              {emailReadiness.data?.sender.ready &&
              selectedRecipient &&
              finalReviewAcknowledged
                ? "Final delivery not enabled"
                : "Await sender verification"}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

import { trpc } from "@/lib/trpc";
import {
  CheckCircle2,
  Loader2,
  MailCheck,
  Send,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const inputClass =
  "h-9 w-full rounded-lg border border-[#dfe5df] bg-[#fbfcfa] px-3 text-xs text-[#15201c] outline-none transition focus:border-[#0f5c4f] focus:ring-2 focus:ring-[#0f5c4f]/10";

function formatDate(value: Date | string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "Not recorded";
}

export function StudentPortalAccessPanel({
  schoolId,
  students,
  onDone,
}: {
  schoolId: number;
  students: Array<{
    id: number;
    firstName: string;
    lastName: string;
    admissionNo: string;
  }>;
  onDone: () => void;
}) {
  const [studentId, setStudentId] = useState("");
  const [email, setEmail] = useState("");
  const [preparationConfirmed, setPreparationConfirmed] = useState(false);
  const [reviewInvitationId, setReviewInvitationId] = useState<number | null>(
    null
  );
  const [sendConfirmedFor, setSendConfirmedFor] = useState<number | null>(null);
  const selectedStudent = useMemo(
    () => students.find(student => String(student.id) === studentId),
    [studentId, students]
  );
  const invitations = trpc.nsos.students.studentPortalInvitations.useQuery(
    { schoolId, studentId: Number(studentId || 0) },
    { enabled: Boolean(studentId) }
  );
  const prepare = trpc.nsos.students.prepareStudentPortalInvitation.useMutation(
    {
      onSuccess: async () => {
        toast.success("Student invitation prepared. Review it before sending.");
        setEmail("");
        setPreparationConfirmed(false);
        await invitations.refetch();
        onDone();
      },
      onError: error => toast.error(error.message),
    }
  );
  const send = trpc.nsos.students.sendStudentPortalInvitation.useMutation({
    onSuccess: async () => {
      toast.success("Student portal invitation submitted for delivery.");
      setSendConfirmedFor(null);
      await invitations.refetch();
      onDone();
    },
    onError: error => toast.error(error.message),
  });
  const resetStudent = (value: string) => {
    setStudentId(value);
    setEmail("");
    setPreparationConfirmed(false);
    setReviewInvitationId(null);
    setSendConfirmedFor(null);
  };
  const prepareInvitation = () => {
    if (studentId)
      prepare.mutate({
        schoolId,
        studentId: Number(studentId),
        email,
        confirmed: true,
      });
  };
  const submitInvitation = (invitationId: number) =>
    send.mutate({
      schoolId,
      invitationId,
      origin: window.location.origin,
      confirmed: true,
    });

  return (
    <section className="rounded-[1.2rem] border border-[#e0e5df] bg-white p-5 shadow-[0_10px_32px_rgba(16,45,35,0.035)] sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e5f1eb] text-[#176145]">
          <MailCheck className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-semibold text-[#2d4439]">
            Student portal access
          </p>
          <p className="mt-1 text-xs leading-5 text-[#758079]">
            Prepare a secure student invitation for an active learner. The
            learner becomes linked only after verifying their email; no password
            or credential is placed in the message.
          </p>
        </div>
      </div>
      <label className="mt-5 grid max-w-md gap-1.5 text-xs font-semibold text-[#43534c]">
        <span>Student profile</span>
        <select
          className={inputClass}
          value={studentId}
          onChange={event => resetStudent(event.target.value)}
        >
          <option value="">Select student</option>
          {students.map(student => (
            <option key={student.id} value={student.id}>
              {student.firstName} {student.lastName} · {student.admissionNo}
            </option>
          ))}
        </select>
      </label>
      {selectedStudent && (
        <div className="mt-4 rounded-xl border border-[#dbe8df] bg-[#f7fbf7] p-4">
          <p className="text-xs font-bold text-[#285141]">
            Prepare a student invitation
          </p>
          <p className="mt-1 text-[11px] leading-5 text-[#61776c]">
            Enter a learner-controlled email address. Preparing records a
            seven-day draft only; a separate confirmation is required before
            NSOS submits any email.
          </p>
          <label className="mt-3 grid gap-1 text-[11px] font-semibold text-[#43534c]">
            <span>Learner-controlled email</span>
            <input
              type="email"
              autoComplete="email"
              className={inputClass}
              value={email}
              onChange={event => setEmail(event.target.value)}
              placeholder="learner@example.com"
            />
          </label>
          <label className="mt-3 flex gap-2 text-[11px] font-semibold text-[#385b4c]">
            <input
              type="checkbox"
              checked={preparationConfirmed}
              onChange={event => setPreparationConfirmed(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#0f5c4f]"
            />
            I confirm this is the learner’s authorised email address for the
            selected student.
          </label>
          <button
            type="button"
            disabled={
              !email.trim() || !preparationConfirmed || prepare.isPending
            }
            onClick={prepareInvitation}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#0f5c4f] px-3 py-2 text-[11px] font-bold text-white disabled:opacity-50"
          >
            {prepare.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            {prepare.isPending ? "Preparing…" : "Prepare invitation"}
          </button>
        </div>
      )}
      {invitations.isLoading ? (
        <p className="mt-4 inline-flex items-center gap-2 text-xs text-[#758079]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking invitation status…
        </p>
      ) : invitations.error ? (
        <p className="mt-4 text-xs text-[#a13e38]">
          {invitations.error.message}
        </p>
      ) : invitations.data?.length ? (
        <div className="mt-4 grid gap-2">
          {invitations.data.map(invitation => (
            <article
              key={invitation.id}
              className="rounded-xl border border-[#e2e8e2] bg-[#fbfcfa] p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-[#2d4439]">
                    {invitation.email}
                  </p>
                  <p className="mt-1 text-[11px] text-[#718078]">
                    Status: {invitation.status} · Expires{" "}
                    {formatDate(invitation.expiresAt)}
                  </p>
                </div>
                {invitation.status === "draft" && (
                  <button
                    type="button"
                    onClick={() => {
                      const opening = reviewInvitationId !== invitation.id;
                      setReviewInvitationId(opening ? invitation.id : null);
                      setSendConfirmedFor(null);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#b9d9c2] bg-[#f5fbf6] px-3 py-2 text-[11px] font-bold text-[#176145]"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {reviewInvitationId === invitation.id
                      ? "Cancel send"
                      : "Review and send"}
                  </button>
                )}
              </div>
              {invitation.status === "draft" &&
                reviewInvitationId === invitation.id && (
                  <div className="mt-3 rounded-lg border border-[#d6e6da] bg-[#f3faf4] p-3">
                    <p className="text-[11px] font-bold text-[#285141]">
                      Final delivery confirmation
                    </p>
                    <p className="mt-1 text-[11px] leading-4 text-[#61776c]">
                      NSOS will submit one secure, time-limited sign-in link to{" "}
                      {invitation.email}. The student portal link remains
                      inactive until the learner verifies that email.
                    </p>
                    <label className="mt-3 flex gap-2 text-[11px] font-semibold text-[#385b4c]">
                      <input
                        type="checkbox"
                        checked={sendConfirmedFor === invitation.id}
                        onChange={event =>
                          setSendConfirmedFor(
                            event.target.checked ? invitation.id : null
                          )
                        }
                        className="mt-0.5 h-4 w-4 accent-[#0f5c4f]"
                      />
                      I confirm this exact invitation should be sent.
                    </label>
                    <button
                      type="button"
                      disabled={
                        send.isPending || sendConfirmedFor !== invitation.id
                      }
                      onClick={() => submitInvitation(invitation.id)}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#0f5c4f] px-3 py-2 text-[11px] font-bold text-white disabled:opacity-50"
                    >
                      {send.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      {send.isPending
                        ? "Submitting…"
                        : "Send confirmed invitation"}
                    </button>
                  </div>
                )}
            </article>
          ))}
        </div>
      ) : studentId ? (
        <p className="mt-4 rounded-xl border border-dashed border-[#d8e2d9] bg-[#fbfcfa] p-4 text-xs leading-5 text-[#758079]">
          No student invitation has been prepared for this learner.
        </p>
      ) : null}
      <div className="mt-5 flex gap-2 rounded-xl border border-[#dbe8df] bg-[#f7fbf7] p-3 text-[11px] leading-5 text-[#587066]">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#176145]" />
        Only owners and administrators can prepare or submit invitations.
        Invitations are tenant-scoped, rate-limited, expire after seven days,
        require verified email sign-in, and are recorded in the security audit
        trail.
      </div>
    </section>
  );
}

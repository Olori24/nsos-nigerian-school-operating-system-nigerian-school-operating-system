import { randomUUID } from "node:crypto";

type StudentRecord = {
  student: { id: number; firstName: string; middleName?: string | null; lastName: string; admissionNo: string; email?: string | null };
  guardians: Array<{ id: number; firstName: string; lastName: string; relationship?: string | null; email?: string | null; isPrimary?: boolean | null }>;
  enrollments: Array<{ id: number; className?: string | null; sessionName?: string | null; status?: string | null; enrolledOn?: string | Date | null }>;
};

export type StudentRecordEmailRecipient = { kind: "student" | "guardian"; guardianId?: number; label: string; maskedEmail: string };
export const studentRecordEmailCopyBounds = { subjectMin: 3, subjectMax: 180, bodyMin: 10, bodyMax: 3000 } as const;

const escapeHtml = (value: string) => value.replace(/[&<>"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character] ?? character);
const safeValue = (value?: string | number | null, fallback = "Not recorded") => String(value ?? "").trim() || fallback;
const stripUnsafeControls = (value: string, preserveLineBreaks: boolean) => value.replace(/\r\n?/g, preserveLineBreaks ? "\n" : "").replace(/[\u0000-\u0009\u000B\u000C\u000E-\u001F\u007F]/g, "");

export function maskStudentRecordEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "registered email";
  return `${local.slice(0, 1)}${"•".repeat(Math.max(2, Math.min(8, local.length - 1)))}@${domain}`;
}

export function studentRecordEmailRecipients(record: StudentRecord): StudentRecordEmailRecipient[] {
  const recipients: StudentRecordEmailRecipient[] = [];
  if (record.student.email?.trim()) recipients.push({ kind: "student", label: "Student registered email", maskedEmail: maskStudentRecordEmail(record.student.email) });
  record.guardians.forEach(guardian => {
    if (!guardian.email?.trim()) return;
    const name = `${guardian.firstName} ${guardian.lastName}`.trim();
    recipients.push({ kind: "guardian", guardianId: guardian.id, label: guardian.isPrimary ? `Primary guardian · ${name}` : `Guardian · ${name}`, maskedEmail: maskStudentRecordEmail(guardian.email) });
  });
  return recipients;
}

export function resolveStudentRecordEmailRecipient(record: StudentRecord, recipient: { kind: "student" | "guardian"; guardianId?: number }) {
  if (recipient.kind === "student") {
    if (!record.student.email?.trim()) throw new Error("This student does not have a registered email address.");
    return { email: record.student.email.trim(), recipient: { kind: "student" as const, label: "Student registered email", maskedEmail: maskStudentRecordEmail(record.student.email) } };
  }
  const guardian = record.guardians.find(item => item.id === recipient.guardianId);
  if (!guardian?.email?.trim()) throw new Error("The selected guardian does not have a registered email address for this student.");
  return { email: guardian.email.trim(), recipient: { kind: "guardian" as const, guardianId: guardian.id, label: guardian.isPrimary ? "Primary guardian" : "Guardian", maskedEmail: maskStudentRecordEmail(guardian.email) } };
}

function attachmentFilename(admissionNo: string) {
  const stem = admissionNo.toLocaleLowerCase("en-NG").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "student-record";
  return `${stem}-student-enrollment-record.pdf`;
}

export async function buildStudentRecordPdfAttachment(record: StudentRecord, enrollmentId: number) {
  const enrollment = record.enrollments.find(item => item.id === enrollmentId);
  if (!enrollment) throw new Error("The selected enrollment record was not found for this student.");
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 42;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 54;
  const ensureSpace = (needed = 26) => { if (y + needed > pageHeight - 48) { doc.addPage(); y = 50; } };
  const write = (text: string, options: { size?: number; bold?: boolean; color?: [number, number, number]; gap?: number } = {}) => {
    const size = options.size ?? 10;
    const lines = doc.splitTextToSize(text, pageWidth - margin * 2);
    ensureSpace(lines.length * (size + 4) + 4);
    doc.setFont("helvetica", options.bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...(options.color ?? [47, 71, 59]));
    doc.text(lines, margin, y);
    y += lines.length * (size + 4) + (options.gap ?? 7);
  };
  const primaryGuardian = record.guardians.find(guardian => guardian.isPrimary) ?? record.guardians[0];
  const studentName = [record.student.firstName, record.student.middleName, record.student.lastName].filter(Boolean).join(" ");
  const enrolledOn = enrollment.enrolledOn ? new Date(enrollment.enrolledOn).toLocaleDateString("en-NG", { dateStyle: "medium" }) : "Not recorded";

  doc.setFillColor(15, 92, 79); doc.rect(0, 0, pageWidth, 116, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(17); doc.setTextColor(255, 255, 255); doc.text("NSOS", margin, 42);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(220, 239, 225); doc.text("NIGERIAN SCHOOL OPERATING SYSTEM", margin, 57);
  doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(255, 255, 255); doc.text("Student profile & enrollment record", margin, 84);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(220, 239, 225); doc.text(`Generated ${new Date().toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}`, margin, 101);
  y = 146;
  write("This PDF contains only the tenant-scoped student and enrollment information authorized for this share.", { size: 9, color: [102, 120, 109], gap: 13 });
  [
    ["Student", safeValue(studentName)], ["Admission number", safeValue(record.student.admissionNo)], ["Primary guardian", primaryGuardian ? `${safeValue(primaryGuardian.firstName)} ${safeValue(primaryGuardian.lastName)}`.trim() : "Not linked"], ["Guardian relationship", safeValue(primaryGuardian?.relationship)], ["Enrollment ID", String(enrollment.id)], ["Class", safeValue(enrollment.className)], ["Session", safeValue(enrollment.sessionName)], ["Enrollment status", safeValue(enrollment.status)], ["Enrolled on", enrolledOn],
  ].forEach(([label, value]) => { write(label, { size: 9, bold: true, color: [20, 74, 59], gap: 1 }); write(value, { size: 10, gap: 9 }); });
  doc.setDrawColor(220, 230, 222); ensureSpace(18); doc.line(margin, y, pageWidth - margin, y); y += 16;
  write("This protected record does not create or change an enrollment, admission decision, payment, receipt, certificate, or communication.", { size: 8, color: [102, 120, 109], gap: 0 });
  return { filename: attachmentFilename(record.student.admissionNo), base64: Buffer.from(doc.output("arraybuffer")).toString("base64"), studentName, admissionNo: record.student.admissionNo, idempotencyKey: `student-record-${record.student.id}-${enrollment.id}-${randomUUID()}` };
}

export function studentRecordEmailCopy(input: { studentName: string; admissionNo: string }) {
  return normaliseStudentRecordEmailCopy({
    subject: `Student profile and enrollment record · ${input.admissionNo}`,
    body: `Hello,\n\nAttached is the NSOS student profile and enrollment record for ${input.studentName} (${input.admissionNo}).\n\nThis record was shared by an authorised school user. If you were not expecting it, please contact the school directly.\n\nNSOS`,
  });
}

export function normaliseStudentRecordEmailCopy(input: { subject: string; body: string }) {
  const subject = stripUnsafeControls(input.subject, false).trim().slice(0, 255);
  const text = stripUnsafeControls(input.body, true).trim().slice(0, studentRecordEmailCopyBounds.bodyMax);
  const html = `<div>${text.split("\n").map(line => escapeHtml(line)).join("<br />")}</div>`;
  return { subject, text, html };
}
